import { el, setChildren, mount } from 'redom';

window.CookieConsent.buffer = {
  appendChild: [],
  insertBefore: []
}

window.CookieConsent.functions = {}

// If consent cookie exists
// were parsing its content to config
cookieToConfig();

// Overriding the appendChild and insertBefore methods
// To filter any scripts inserted at page load
// Were also buffering the blocked scripts so we can re-add later 
;(function (Cookie) {
  
  Element.prototype.appendChild = function(elem) {
    
    if(arguments[0].tagName === 'SCRIPT') {
      console.log('Appending:', arguments);
      for (let key in Cookie.config.services) {
        // Did user opt-in?
        if(Cookie.config.services[key].type === 'dynamic-script') {
          if(arguments[0].outerHTML.indexOf(Cookie.config.services[key].search) >= 0) {
            if(window.CookieConsent.config.categories[window.CookieConsent.config.services[key].category].wanted === false) {
              Cookie.buffer.appendChild.push({'this': this, 'category': window.CookieConsent.config.services[key].category, arguments: arguments});
              return undefined;
            }
          }
        }
      }
    } 

    return Node.prototype.appendChild.apply(this, arguments);
  }
  
  Element.prototype.insertBefore = function(elem) {
    
    
    if(arguments[0].tagName === 'SCRIPT') {
      console.log('Inserting:', arguments);
      for (let key in Cookie.config.services) {
        // Did user opt-in?
        if(Cookie.config.services[key].type === 'dynamic-script') {
          if(arguments[0].outerHTML.indexOf(Cookie.config.services[key].search) >= 0) {
            if(window.CookieConsent.config.categories[window.CookieConsent.config.services[key].category].wanted === false) {
              Cookie.buffer.insertBefore.push({'this': this, 'category': window.CookieConsent.config.services[key].category, arguments: arguments});
              return undefined;
            }
          }
        }
      }
    }

    return Node.prototype.insertBefore.apply(this, arguments);
  }
})(window.CookieConsent);


// Were building the interface and binding the events
;(function (Cookie) {

  buildInterface(function(bar, modal) {

    // Show bar
    if ( ! window.CookieConsent.config.cookieExists) {
      setTimeout(() => {
        bar.classList.remove('hidden');
      }, 3000);
    }
    
    refreshModal(modal);

    // If you click Accept all cookies
    document.getElementById('consent-give').addEventListener('click', function () {

      // We set config to full consent
      for(let key in Cookie.config.categories) {
        Cookie.config.categories[key].wanted = true;
      }
      
      writeBufferToDOM();

      buildCookie((cookie) => {
        setCookie(cookie);
      });

      bar.classList.add('hidden');

    });

    // If you click Cookie settings
    Array.prototype.forEach.call(document.getElementsByClassName('consent-edit'), (edit) => {
      edit.addEventListener('click', function () {
        refreshModal(modal);
        modal.classList.add('visible');
      });
    });

    // If you click trough the tabs on Cookie settings
    modal.querySelector('.left').addEventListener('click', function(event){
      if (event.target.classList.contains('tab')) {
        if (event.target.dataset.tab) {
          let tabContents = modal.querySelectorAll('[class^=tab-content]');
          let tabs = modal.querySelectorAll('.tab');

          tabs.forEach((tab) => {
            tab.classList.remove('active');
          });

          tabContents.forEach((tabContent) => {
            tabContent.classList.remove('visible');
          });

          event.target.classList.add('active');
          modal.querySelector(`[class=tab-content-${event.target.dataset.tab}]`).classList.add('visible');
        }
      }
    });

    // If you click trough the tabs on Cookie settings
    modal.querySelector('.close').addEventListener('click', function(event){
      modal.classList.remove('visible');
    });

    // If you switch on and off categories
    modal.querySelector('.right').addEventListener('click', function(event){
      if (event.target.classList.contains('category-onoff')) {
        let status = event.target.parentNode.previousSibling;
        if (event.target.checked === false) {
          status.textContent = 'OFF'
        } else if (event.target.checked === true) {
          status.textContent = 'ON'
        }
      }
    });

    // If you click submit on cookie settings
    document.getElementById('cookie-modal-submit').addEventListener('click', function() {

      modal.querySelectorAll('.switch input').forEach(function(elem){
        Cookie.config.categories[elem.dataset.category].wanted = elem.checked;
      });

      buildCookie((cookie) => {
        setCookie(cookie, () => {
          modal.classList.remove('visible');
          bar.classList.add('hidden');
        });
      });

      writeBufferToDOM();

    });
  });

})(window.CookieConsent);


// Blocking SCRIPT tags by renaming them
;(function (Cookie) {

  ready(function(){

    // Populating a blacklist of services to block
    var scriptTagServices = {};
    for(var service in Cookie.config.services) {
      if (Cookie.config.services[service].type === 'script-tag') {
        if(Cookie.config.categories[Cookie.config.services[service].category].needed === false) {
          if (Cookie.config.categories[Cookie.config.services[service].category].wanted === false) {
            scriptTagServices[service] = Cookie.config.services[service];
          }
        }
      }
    }

    // Creating a list of blocked names for quick access
    var scriptTagServiceNames = [];
    for(var scriptTagService in scriptTagServices) {
      scriptTagServiceNames.push(scriptTagService);
    }
    var scriptTags = document.querySelectorAll('script[type="text/plain"]');
    
    for (var scriptTag of scriptTags) {
      var newtag = scriptTag.cloneNode();
      newtag.type = 'application/javascript';
      if (scriptTagServiceNames.indexOf(scriptTag.dataset.consent) < 0) {
        var parentNode = scriptTag.parentNode;
        parentNode.insertBefore(newtag,scriptTag);
        parentNode.removeChild(scriptTag);
      }
    }
  });

})(window.CookieConsent);


// Wrapper function to block scripts
;(function (Cookie) {

  // Populating a blacklist of services to block
  var wrapperServices = {};
  for(var service in Cookie.config.services) {
    if (Cookie.config.services[service].type === 'wrapped') {
      if(Cookie.config.categories[Cookie.config.services[service].category].needed === false) {
        if (Cookie.config.categories[Cookie.config.services[service].category].wanted === false) {
          wrapperServices[service] = Cookie.config.services[service];
        }
      }
    }
  }

  // Creating a list of blocked names for quick access
  var wrapperServiceNames = [];
  for(var wrapperService in wrapperServices) {
    wrapperServiceNames.push(wrapperService);
  }

  function wrapper(name='', callback) {
    if (wrapperServiceNames.indexOf(name) < 0) {
      callback();
    }
  }

  Cookie.functions.wrapper = wrapper;

})(window.CookieConsent);


// Blocking local cookies
;(function (Cookie) {

  // TODO - implement buffer

  var cookieDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie') ||
                         Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');

  if (! cookieDescriptor) {
    cookieDescriptor = {};
    cookieDescriptor.get = document.__lookupGetter__("cookie");
    cookieDescriptor.set = document.__lookupSetter__("cookie");
  }

  // Populating a blacklist of services to block
  var cookieServices = {};
  for(var service in Cookie.config.services) {
    if (Cookie.config.services[service].type === 'localcookie') {
      if(Cookie.config.categories[Cookie.config.services[service].category].needed === false) {
        if (Cookie.config.categories[Cookie.config.services[service].category].wanted === false) {
          cookieServices[service] = Cookie.config.services[service];
        }
      }
    }
  }

  // Creating a blacklist of blocked names for quick access
  var cookieServiceNames = [];
  for(var cookieService in cookieServices) {
    var type = objectType(cookieServices[cookieService].search);
    if (type === 'String') {
      cookieServiceNames.push(cookieServices[cookieService].search);
    } else if(type === 'Array') {
      for (let i = 0; i < cookieServices[cookieService].search.length; i++) {
        cookieServiceNames.push(cookieServices[cookieService].search[i]);
      }
    }
  }

  Object.defineProperty(document, "cookie", {
    configurable: true,
    get: function () {
      return cookieDescriptor.get.apply(document);
    },
    set: function () {
      var cookieName = arguments[0].split('=')[0];
      if (cookieServiceNames.indexOf(cookieName) < 0) return cookieDescriptor.set.apply(document, arguments);
    }
  });

})(window.CookieConsent);


function ready(fn) {
  if (document.attachEvent ? document.readyState === "complete" : document.readyState !== "loading"){
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

function objectType(obj){
  return Object.prototype.toString.call(obj).slice(8, -1);
}

function writeBufferToDOM() {

  window.CookieConsent.buffer.appendChild.forEach(function(action, index){
    if (window.CookieConsent.config.categories[action.category].wanted === true) {
      Node.prototype.appendChild.apply(action.this, action.arguments);
    }
  });

  window.CookieConsent.buffer.insertBefore.forEach(function(action){
    if (window.CookieConsent.config.categories[action.category].wanted === true) {
      Node.prototype.insertBefore.apply(action.this, action.arguments);
    }
  });
}

function buildCookie(callback) {
  let cookie = {};
  
  for(let key in window.CookieConsent.config.categories) {
    cookie[key] = window.CookieConsent.config.categories[key].wanted;
  }

  if (callback) callback(cookie);
  return cookie;
}

function setCookie(cookie, callback) {
  document.cookie = `cconsent=${JSON.stringify(cookie)}; expires=Thu, 01 Jan 2099 00:00:00 UTC; path=/;`;
  if (callback) callback();
}

function removeCookie(cookie) {
  document.cookie = `cconsent=; expires=Thu, 01 Jan 2099 00:00:00 UTC; path=/;`;
}

function cookieToConfig() {
  (document.cookie.split(';').filter((item) => {
    if (item.indexOf('cconsent')  >= 0) {
      window.CookieConsent.config.cookieExists = true;
      var cookieData = JSON.parse(item.split('=')[1]);
      for (let key in cookieData) {
        window.CookieConsent.config.categories[key].wanted = cookieData[key];
      }
      return true;
    }
  }).length)

  return false;
}

function refreshModal(modal) {
  Array.prototype.forEach.call(modal.querySelectorAll('div[class^=tab-content]'), (tabContent) => {
    let category = tabContent.dataset.category;
    if(category) {
      if (tabContent.querySelector('.switch-group')) {
        tabContent.querySelector('.switch-group .status').textContent = (window.CookieConsent.config.categories[category].wanted === true) ? 'ON' : 'OFF'; 
        tabContent.querySelector('.switch-group .category-onoff').checked = (window.CookieConsent.config.categories[category].wanted === true) ? true : false; 
      }
    }
  });
}

function buildInterface(callback) {

  ready(function() {
    var style = el('style',
    '#cookie-bar, #cookie-bar * {box-sizing:border-box}', 
    '#cookie-bar {background-color:#63B3E3; color:#FFF; padding:20px 15px; text-align:right; font-family:sans-serif; font-size:14px; position:fixed; bottom:0; left:0; width:100%; z-index:9998; transform: translateY(0); transition: transform .6s ease-in-out; transition-delay: .3s;}', 
    '#cookie-bar.hidden {transform: translateY(100%)}', 
    '#cookie-bar>div {display:inline-block}',
    '#cookie-bar a {text-decoration:underline; margin-right:20px; color:#FFF}',
    '#cookie-bar button {border:none;padding:10px 10px;color:#63B3E3;background-color:#FFF;}',
    '#cookie-bar a:hover, #cookie-bar button:hover {cursor:pointer;}',
    '#cookie-modal {display:none; width: 100vw; height: 100vh; position:fixed; left:0; top:0; right:0; bottom:0; font-family:sans-serif; font-size:14px; background-color:rgba(0,0,0,0.6); z-index:9999; align-items:center; justify-content:center;}',
    '#cookie-modal.visible {display:flex}',
    '#cookie-modal .content {width:500px; background-color:#FFF;}',
    '#cookie-modal .heading {text-align:center; border-bottom:1px solid #D8D8D8; padding:20px 0; position:relative;}',
    '#cookie-modal .heading h2 {margin:0}',
    '#cookie-modal .heading .close {font-weight:600; color:#888; cursor:pointer; font-size:26px; position: absolute; right:15px; top: 50%; transform: translateY(-50%)}',
    '#cookie-modal h2, #cookie-modal h3 {margin-top:0}',
    '#cookie-modal .content > .body {display:flex;}',
    '#cookie-modal .content > .body > .left {width:30%; background-color: #EEE;}',
    '#cookie-modal .content > .body > .right {width:70%; min-height: 200px;}',
    '#cookie-modal .content > .body > .left .tab {padding:10px; cursor:pointer; background-color:#EEE; border-bottom:1px solid #D8D8D8}',
    '#cookie-modal .content > .body > .left .tab.active {background-color:#FFF;}',
    '#cookie-modal [class^=tab-content] {display:none; padding:15px 20px}',
    '#cookie-modal [class^=tab-content].visible {display:block}',
    '#cookie-modal [class^=tab-content] > .head {position: relative}',
    '#cookie-modal [class^=tab-content] > .head h3 {padding-right: 75px}',
    '#cookie-modal [class^=tab-content] > .head .status {position: absolute; top: 2px; right: 45px;}',
    '#cookie-modal [class^=tab-content] > .head .switch {position: absolute; top:0; right:0; display: inline-block; width: 40px; height: 20px;}',
    '#cookie-modal [class^=tab-content] > .head .switch input {display:none;}',
    '#cookie-modal [class^=tab-content] > .head .switch .slider  {position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; border-radius:10px; -webkit-transition: .4s; transition: .4s;}',
    '#cookie-modal [class^=tab-content] > .head .switch .slider:before  {position: absolute; content: ""; height: 12px; width: 12px; left: 4px; bottom: 4px; background-color: white; border-radius:50%; -webkit-transition: .4s; transition: .4s;}',
    '#cookie-modal [class^=tab-content] > .head .switch input:checked + .slider  {background-color: #2196F3;}',
    '#cookie-modal [class^=tab-content] > .head .switch input:focus + .slider  {box-shadow: 0 0 1px #2196F3;}',
    '#cookie-modal [class^=tab-content] > .head .switch input:checked + .slider:before  {-webkit-transform: translateX(20px); -ms-transform: translateX(20px); transform: translateX(20px);}',
    '#cookie-modal [class^=tab-content] .list ul {padding: 0 0 0 16px}',
    '#cookie-modal [class^=tab-content] > .body {color: #888}',
    '#cookie-modal .footer {border-top:1px solid #D8D8D8; padding:10px; display:flex; justify-content:space-between;}',
    '#cookie-modal .footer .left a {line-height:3.3em; font-size:0.7em; color:#000;}',
    '#cookie-modal .footer .right button {border:none; background-color:#63B3E3; color:#FFF; padding:10px; cursor:pointer}',
    );

    var bar =
    el('div#cookie-bar.hidden',
      [el('div.link', el('a#consent-edit.consent-edit', 'Cookie settings')),
      el('div.button', el('button#consent-give', 'Accept all cookies'))]);

    // Cookie names list middleware
    var listCookies = function(category) {
      var list = [];

      for(let service in window.CookieConsent.config.services) {
        (window.CookieConsent.config.services[service].category === category) && list.push(window.CookieConsent.config.services[service]);
      }
      
      if(list.length) {
        
        var listItems = [];
        
        for(let item in list) {
          var type = objectType(list[item].cookieName);

          if(type === 'String') {
            listItems.push(el('li', list[item].cookieName));
          } else if (type === 'Array') {
            for(let name in list[item].cookieName) {
              listItems.push(el('li', list[item].cookieName[name]));
            }
          }
        }
        return [el('ul', listItems)];
      }
    }
    
    // Modal tab list middleware
    var modalTabList = function(elem) {
      let listItems = [];

      function firstIsActive(i) {
        return (i === 0) ? ' active' : '';
      }

      let i = 0;
      for (let key in window.CookieConsent.config.categories) {
        listItems.push(el('div.tab' + firstIsActive(i), window.CookieConsent.config.categories[key].name, {'data-tab': key}));
        i++;
      }

      // Adding last static informational tab
      listItems.push(el('div.tab', 'More Information', {'data-tab':'last'}));

      // TODO return array
      setChildren(elem, listItems);
    }

    // Modal tab content middleware
    var modalTabContentList = function(elem) {
      let contentItems = [];

      function firstIsVisible(i) {
        return (i === 0) ? ' visible' : '';
      }

      let i = 0;
      for (let key in window.CookieConsent.config.categories) {
        contentItems.push(el('div.tab-content-' + key + firstIsVisible(i), {'data-category':key},
                            el('div.head',
                              el('h3', window.CookieConsent.config.categories[key].name),
                              ( ! window.CookieConsent.config.categories[key].needed) && el('div.switch-group',
                                el('span.status'),
                                el('label.switch',
                                  el('input.category-onoff', {type:'checkbox', 'data-category': key}), el('span.slider'))),
                              ),
                              el('div.body',
                                [el('p', window.CookieConsent.config.categories[key].text)]),
                              el('div.list',
                                listCookies(key)))); 
        i++;
      }

      // Adding last static informational content
      contentItems.push(el('div.tab-content-last',
                          el('div.head',
                            el('h3', 'More Information')
                          ),
                          el('div.body',
                            el('p', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur eu commodo est, nec gravida odio. Suspendisse scelerisque a ex nec semper.')
                          )
                        )); 
      
      // TODO return array
      setChildren(elem, contentItems);
    }

    var modal =
    el('div#cookie-modal',
      el('div.content',
        el('div.heading',
          el('h2', 'Cookie settings'),
          el('div.close', '×')
        ),
        el('div.body',
          el('div.left', modalTabList),
          el('div.right', modalTabContentList)
        ),
        el('div.footer',
          el('div.left', 
            el('a', 'Cookieconsent', {href:'https://github.com/brainsum/cookieconsent', target: '_blank', rel:'noopener noreferrer'})),
          el('div.right',
            el('button#cookie-modal-submit', 'Save settings')))));

    mount(document.body, bar);
    mount(document.body, modal);
    mount(document.body, style);

    callback(bar, modal);
  });

}



