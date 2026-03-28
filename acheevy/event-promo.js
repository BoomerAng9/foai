/**
 * Event Promotion Banner — Coastal Talent & Innovation Hack-A-Thon
 * Handles banner display, dismiss functionality, cookie management,
 * auto-show animation, and UTM parameter tracking.
 */
(function () {
  'use strict';

  var COOKIE_NAME = 'ctih_banner_dismissed';
  var COOKIE_DAYS = 7;
  var AUTO_SHOW_DELAY = 3000; // 3 seconds
  var UTM_PARAMS = '?utm_source=acheevy-digital';

  /**
   * Cookie helpers
   */
  function setCookie(name, value, days) {
    var expires = '';
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + (value || '') + expires + '; path=/; SameSite=Lax';
  }

  function getCookie(name) {
    var nameEQ = name + '=';
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var c = cookies[i].trim();
      if (c.indexOf(nameEQ) === 0) {
        return c.substring(nameEQ.length);
      }
    }
    return null;
  }

  /**
   * Dismiss the banner and set a cookie so it stays hidden
   */
  function dismissBanner() {
    var banner = document.getElementById('ctih-promo-banner');
    if (banner) {
      banner.style.transform = 'translateY(-100%)';
      setTimeout(function () {
        banner.style.display = 'none';
      }, 400);
    }
    setCookie(COOKIE_NAME, '1', COOKIE_DAYS);
  }

  /**
   * Show the banner with a slide-down animation
   */
  function showBanner() {
    var banner = document.getElementById('ctih-promo-banner');
    if (!banner) return;

    banner.style.display = 'block';
    // Force reflow so the transition triggers
    void banner.offsetHeight;
    banner.style.transform = 'translateY(0)';
  }

  /**
   * Append UTM parameters to the event link
   */
  function applyUtmTracking() {
    var link = document.getElementById('ctih-promo-link');
    if (link) {
      var baseUrl = link.getAttribute('href').replace(/\?.*$/, '');
      link.setAttribute('href', baseUrl + UTM_PARAMS);
    }
  }

  /**
   * Initialise on DOM ready
   */
  function init() {
    // If previously dismissed, do nothing
    if (getCookie(COOKIE_NAME)) return;

    // Apply UTM tracking to the link
    applyUtmTracking();

    // Auto-show after delay with slide-down animation
    setTimeout(showBanner, AUTO_SHOW_DELAY);
  }

  // Expose dismiss globally for the inline onclick handler
  window.dismissCtihBanner = dismissBanner;

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
