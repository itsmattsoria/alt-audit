// Initialize butotn with users's prefered color
let alAuditButton = document.getElementById("runAltAudit");

// When the button is clicked, inject runAltAuditOnPage into current page
alAuditButton.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: runAltAuditOnPage,
  }, () => { window.close(); });
});

// The body of this function will be execuetd as a content script inside the
// current page
function runAltAuditOnPage() {
  let altAudit;

  // First Inject Loading Screen
  let loadingScreen = document.createElement('div');
  loadingScreen.id = 'altAudit-loading';
  loadingScreen.innerHTML = '<h1 style="font-family:monospace!important;font-style:normal!important;font-size:24px!important;font-weight:bold!important;border-bottom:3px solid #000!important;text-transform:none!important;color:#000!important;">Running audit...</h1>';
  loadingScreen.setAttribute('style', 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background-color:rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;text-align:center;');
  document.body.append(loadingScreen);

  // Scroll to bottom to trigger load morez
  let scrollHeight = document.body.scrollHeight;
  let repeated = 0;

  scrollDown();
  const intervalTask = setInterval(scrollDown, 1200);

  // ToDo: Refactor to build image list iteratively as the page scrolls down
  function scrollDown() {
    if (repeated > 1 && document.body.scrollHeight === scrollHeight) {
      clearInterval(intervalTask);
      window.scrollTo(0, 0);
      initAltAudit();
      return;
    }

    if (repeated === 0 || document.body.scrollHeight !== scrollHeight) {
      scrollHeight = document.body.scrollHeight;
      window.scrollTo(0, scrollHeight);
      repeated += 1
    } else {
      clearInterval(intervalTask);
      window.scrollTo(0, 0);
      initAltAudit();
    }
  }

  // the main business
  function initAltAudit() {
    let images = document.querySelectorAll('img'),
        imageCount = images.length,
        altTags = document.querySelectorAll('[alt]'),
        altCount = altTags.length,
        altText = [],
        i = altCount,
        filenameRe = /[^\s]+(\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|bmp|BMP|svg|SVG|webp|WEBP))$/g,
        altWarnings = 0,
        altImages = [],
        altImageIndex = 0;

    // build array of alt tags from elements with alt attr
    altTags = Array.from(altTags);

    // Add classes to images based on presence of alt attr
    images.forEach(function(image, index) {
      if (image.hasAttribute('alt') && image.getAttribute('alt') !== '') {
        image.classList.add('altAudit-hasAlt');
        image.setAttribute('data-altaudit-id', altImageIndex);
        altImages.push(image);
        altImageIndex++;
      } else {
        image.classList.add('altAudit-noAlt');
      }
    });

    // prune altTags for empty entries
    while (i--) {
      if (altTags[i].alt === '') {
        altTags.splice(i, 1);
        altCount--;
      } else {
        altText.push(altTags[i].alt)
        if (altTags[i].alt.match(filenameRe)) {
          altWarnings++;
        }
      }
    }
    // flip it back around!
    altText = altText.reverse();

    // If run again, remove the first instance
    if (document.getElementById('altAudit')) {
      document.getElementById('altAudit').remove();
    }
    // Build the report container
    let report = document.createElement('div');
    report.setAttribute('id', 'altAudit');

    // Add a styles element
    let style = document.createElement('style');
    style.type = 'text/css';
    style.id = 'altAudit-styles';
    if (!document.getElementById('altAudit-styles')) {
      document.body.append(style);
    }
    // Styles
    let css = `
      #altAudit,
      #altAudit *,
      #altAudit-loading,
      #altAudit-loading * {
        text-transform: none!important;
        font-family: monospace!important;
      }

      #altAudit .visually-hidden {
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        height: 1px;
        overflow: hidden;
        position: absolute;
        white-space: nowrap;
        width: 1px;
      }

      #altAudit {
        top: 25px;
        width: 50%;
        padding: 0;
        left: 25px;
        height: 75%;
        position: fixed;
        min-width: 360px;
        overflow: hidden;
        background: #fff;
        min-height: 300px;
        color: #000!important;
        resize: both!important;
        border: 5px solid #000;
        z-index: 9999999!important;
        max-width: calc(100% - 200px);
        max-height: calc(100% - 50px);
        border-radius: 10px 10px 0 10px;
        box-shadow: 5px 5px 10px rgba(0,0,0,0.25);
      }

      #altAudit-resizeHandle {
        right: 0;
        bottom: 0;
        z-index: 1;
        width: 26px;
        height: 26px;
        position: absolute;
        border-right: 3px solid #fff;
        border-bottom: 3px solid #fff;
        background-image: linear-gradient(-45deg, #000, #000 3px, #fff 3px, #fff 6px, #000 6px, #000 9px, #fff 9px, #fff 12px, #000 12px, #000 15px, #fff 15px, #fff);
        background-color: #fff;
        clip-path: polygon(85% 0, 100% 0, 100% 100%, 12% 100%, 12% 85%);
      }

      #altAudit.minimized {
        height: 89px!important;
      }

      #altAudit-header {
        z-index: 1;
        position: relative;
        padding: 25px!important;
        background-color: #fff!important;
      }
      #altAudit-header::after {
        bottom: 0;
        left: 25px;
        right: 25px;
        content: '';
        height: 3px;
        position: absolute;
        background-color: #000;
      }

      #altAudit h1 {
        color: #000!important;
        line-height: 1!important;
        font-size: 24px!important;
        margin: 4px 0 0!important;
        font-weight: bold!important;
        font-style: normal!important;
        white-space: nowrap!important;
        text-transform: none!important;
        padding: 0 200px 0 0!important;
      }
      #altAudit h1:focus {
        outline:none!important;
        appearance:none!important;
      }

      #altAudit h3 {
        font-size: 18px;
        font-weight: 400;
        color: #000!important;
        margin: 0 0 1em!important;
      }

      #altAudit h3 strong {
        font-weight: 700;
      }

      .altAudit-headline {
        font-weight: bold!important;
      }

      .altAudit-warningLabel span {
        padding: 0 0.1em;
        display: inline-block;
        background-color: #f6e533;
        font-weight: bold!important;
      }

      #altAudit-overflowContainer {
        bottom: 0;
        top: 78px;
        left: 25px;
        right: 25px;
        overflow: auto;
        position: absolute;
        padding: 25px 0 50px;
      }

      #altAudit-altList {
        margin: 0!important;
        padding: 0!important;
        border: none!important;
        list-style: none!important;
        border-top: 3px solid #000!important;
        counter-reset: list-counter!important;
      }

      .altAudit-highlighted {
        border: 5px solid #1372f6!important;
      }

      .altAudit-noAlt {
        outline: #fc1d22 dashed 5px!important;
      }

      .altAudit-altListItem {
        margin: 0!important;
        cursor: pointer!important;
        padding: 25px 12px!important;
        border-bottom: 1px solid #000!important;
        counter-increment: list-counter!important;
      }
      .altAudit-altListItem::before {
        font-weight: bold!important;
        content: counter(list-counter) ". "!important;
      }
      .altAudit-altListItem:nth-of-type(odd) {
        background-color: #eee!important;
      }

      .altAudit-altListItem:hover span,
      .altAudit-altListItem:focus span,
      .altAudit-altListItem:active span {
        color: #1372f6!important;
        text-decoration: underline;
        font-weight: bold!important;
      }

      .altAudit-altListItem-flagged span {
        padding: 8px!important;
        font-weight: bold!important;
        background-color: #f6e533!important;
      }

      #altAudit-buttonGroup {
        top: 21px;
        z-index: 1;
        right: 25px;
        position: absolute;
        white-space: nowrap;
        display: inline-block;
      }

      #altAudit button {
        color: #000!important;
        padding: 8px!important;
        line-height: 1!important;
        font-size: 14px!important;
        font-weight: bold!important;
        border-radius: 6px!important;
        text-transform: none!important;
        border: 3px solid #000!important;
        background-color: #efefef!important;
      }
      #altAudit button:hover,
      #altAudit button:focus {
        background-color: #ddd!important;
        box-shadow: 0 0 0 2px #fff, 0 0 0 4px #000;
      }
    `;
    // drop in the style element
    style.appendChild(document.createTextNode(css));

    // Get a percentage of alt tags found for images and set up message
    let percentage = Math.round(altCount / imageCount * 100),
        percentageColor = percentage > 90 ? '#20bc20' : '#Fc6467';
    if (percentage === 100) {
      percentage = percentage + '% <span style="text-shadow:0 0 #000;">👍</span>';
    } else {
      percentage = percentage + '% <span style="text-shadow:0 0 #000;">👎</span>';
    }

    // Start building the report markup
    let reportMarkup = '<div id="altAudit-header"><h1 tabindex="0">Alt Audit</h1></div><div id="altAudit-overflowContainer"><h3><strong>' + imageCount + '</strong> total images found, <strong>' + altCount + '</strong> non-empty alt tags found. <span style="display:inline-block;padding:4px 6px;border-radius:6px;font-weight:700;background-color:' + percentageColor  + ';">' + percentage + '</span></h3>';

    // If any warnings were found, let 'em know
    if (altWarnings > 0) {
      let hasHave = altWarnings > 1 ? 'have' : 'has';
      reportMarkup += '<h3 class="altAudit-warningLabel"><span>' + altWarnings + '</span> of those images ' + hasHave + ' alt text that appears to just be the image filename, and have been <span class="altAudit-warningLabel">highlighted</span> below.<h3>';
    }

    // If alt text was found, build a list
    if (altText.length > 0) {
      let altListMarkup = '';
      // Build each list item
      altText.forEach(function(image, index) {
        // Check if it looks like just a file name and flag it with a warning
        let warning = warningMessage = '';
        if (image.match(filenameRe)) {
          warning = ' altAudit-altListItem-flagged';
          warningMessage = '<span class="visually-hidden">Warning: this alt text appears to be just the image filename.</span>';
        }
        altListMarkup += '<li data-altaudit-matching-id="' + index + '" class="altAudit-altListItem' + warning + '"><span>' + image + '</span>' + warningMessage + '</li>';
      });

      reportMarkup += '<h3>Here\'s all of the alt text we found:</h3><ol id="altAudit-altList">' + altListMarkup + '</ol></div>';
    } else {
      // Nothing found — boo!
      reportMarkup += '<h1>😞</h1></div>';
    }

    // Add drag and close buttons and custom resize handle
    reportMarkup += '<div id="altAudit-buttonGroup"><button id="altAudit-dragbar" style="position:relative;cursor: move;cursor: -webkit-grab;cursor: -moz-grab;margin-right:12px!important;padding:8px 8px 8px 26px!important;"><span style="position:absolute;bottom:15px;left:2px;font-weight:normal!important;font-size: 20px;line-height: 20px;color: #000;text-shadow: 0 5px #000, 0 10px #000, 5px 0 #000, 5px 5px #000, 5px 10px #000, 10px 0 #000, 10px 5px #000, 10px 10px #000;">.</span>move</button><button id="altAudit-close">close</button></div><div id="altAudit-resizeHandle"></div>';

    // Drop in the report markup
    report.innerHTML = reportMarkup;

    // Hide Lodaing Screen
    loadingScreen.remove();
    // Plop in the report
    document.body.append(report);
    // Set global var for report
    altAudit = report;

    // Click Listener
    document.addEventListener('click', function (e) {
      // Close it up
      if (e.target.id === 'altAudit-close') {
        report.remove();
        style.remove();
      }

      // Highlight corresponding image and scroll to it
      highlightImage(e.target, true);
    });

    // Highlight corresponding images when hovering over list items
    let altListItems = document.querySelectorAll('.altAudit-altListItem');
    altListItems.forEach(item => {
      item.addEventListener('mouseenter', function() {
        highlightImage(item);
      });
      item.addEventListener('mouseleave', function () {
        removeImageHighlight(item);
      });
    });

    // Highlight Image
    function highlightImage(target, scrollToImage = false) {
      if (target.classList.contains('altAudit-altListItem') || target.parentElement.classList.contains('altAudit-altListItem')) {
        let highlightedImg = document.querySelector('.altAudit-highlighted');
        if (highlightedImg) {
          highlightedImg.style.border = 'none';
          highlightedImg.classList.remove('altAudit-highlighted');
        }

        // Get Target Image ID
        let targetImg;
        if (target.classList.contains('altAudit-altListItem')) {
          targetImg = document.querySelector('[data-altaudit-id="' + target.getAttribute('data-altaudit-matching-id') + '"]');
        } else if (target.parentElement.classList.contains('altAudit-altListItem')) {
          targetImg = document.querySelector('[data-altaudit-id="' + target.parentElement.getAttribute('data-altaudit-matching-id') + '"]');
        }
        // Highlight it
        targetImg.classList.add('altAudit-highlighted');
        // Scroll to the image if clicked
        if (scrollToImage) {
          targetImg.scrollIntoView({ block: "center" });
        }
      }
    }
    // Remove Image Highlight
    function removeImageHighlight(target) {
      let targetImg = document.querySelector('[data-altaudit-id="' + target.getAttribute('data-altaudit-matching-id') + '"]');
      targetImg.classList.remove('altAudit-highlighted');
    }

    // Trap Focus in Report
    const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const firstFocusableElement = altAudit.querySelectorAll(focusableElements)[0]; // get first element to be focused inside altAudit
    const focusableContent = altAudit.querySelectorAll(focusableElements);
    const lastFocusableElement = focusableContent[focusableContent.length - 1]; // get last element to be focused inside altAudit

    document.addEventListener('keydown', function (e) {
      let isTabPressed = e.key === 'Tab' || e.keyCode === 9;

      if (!isTabPressed) {
        return;
      }

      // if shift key pressed for shift + tab combination
      if (e.shiftKey) {
        if (document.activeElement === firstFocusableElement) {
          // add focus for the last focusable element
          lastFocusableElement.focus();
          e.preventDefault();
        }
      // if tab key is pressed
      } else {
        // if focused has reached to last focusable element then focus first focusable element after pressing tab
        if (document.activeElement === lastFocusableElement) {
          // add focus for the first focusable element
          firstFocusableElement.focus();
          e.preventDefault();
        }
      }
    });
    // Focus the first focusable element
    firstFocusableElement.focus();

    // Draggability
    (function () {
      let yDelta,
        xDelta,
        reportHeight,
        reportWidth,
        containerHeight,
        containerWidth,
        offset = 25,
        isMouseDown = false,
        dragBar = document.getElementById('altAudit-dragbar');

      function mouseDown(e) {
        isMouseDown = true;
        // get initial mousedown coordinated
        const mouseY = e.clientY;
        const mouseX = e.clientX;

        // get element top and left positions
        const reportY = altAudit.offsetTop;
        const reportX = altAudit.offsetLeft;

        // get report dimensions
        reportWidth = altAudit.offsetWidth;
        reportHeight = altAudit.offsetHeight;

        // get container dimensions
        containerWidth = window.innerWidth;
        containerHeight = window.innerHeight;

        // get delta from (0,0) to mousedown point
        yDelta = mouseY - reportY;
        xDelta = mouseX - reportX;
      }

      function mouseMove(e) {
        if (!isMouseDown) return;

        // get new mouse coordinates
        const newMouseY = e.clientY;
        const newMouseX = e.clientX;

        // calc new top, left pos of report
        let newReportTop = newMouseY - yDelta,
          newReportLeft = newMouseX - xDelta;

        // calc new bottom, right pos of report
        let newReportBottom = newReportTop + reportHeight,
          newReportRight = newReportLeft + reportWidth;

        if ((newReportTop < offset) || (newReportLeft < offset) || (newReportTop + reportHeight > containerHeight - offset) || (newReportLeft + reportWidth > containerWidth - offset)) {
          // top boundary
          if (newReportTop < offset) {
            newReportTop = offset;
          }
          // left boundary
          if (newReportLeft < offset) {
            newReportLeft = offset;
          }
          // bottom boundary
          if (newReportBottom > containerHeight - offset) {
            newReportTop = containerHeight - reportHeight - offset;
          }
          // right boundary
          if (newReportRight > containerWidth - offset) {
            newReportLeft = containerWidth - reportWidth - offset;
          }
        }
        // Move it!
        moveReport(newReportTop, newReportLeft);
      }

      // Move Report
      function moveReport(yPos, xPos) {
        altAudit.style.top = yPos + 'px';
        altAudit.style.left = xPos + 'px';
      }

      function mouseUp() {
        isMouseDown = false;
      }

      dragBar.addEventListener('mousedown', mouseDown);
      document.addEventListener('mousemove', mouseMove);
      document.addEventListener('mouseup', mouseUp);
    })();
  }
}
