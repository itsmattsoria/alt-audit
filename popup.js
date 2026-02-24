// Initialize butotn with users's prefered color
let alAuditButton = document.getElementById('runAltAudit');

// When the button is clicked, inject runAltAuditOnPage into current page
alAuditButton.addEventListener('click', async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      function: runAltAuditOnPage,
    },
    () => {
      window.close();
    }
  );
});

// The body of this function will be execuetd as a content script inside the
// current page
function runAltAuditOnPage() {
  let altAudit;

  // First Inject Loading Screen
  let loadingScreen = document.createElement('div');
  loadingScreen.id = 'altAudit-loading';
  loadingScreen.innerHTML =
    '<div class="text-large" style="font-family:monospace!important;font-style:normal!important;font-size:24px!important;font-weight:bold!important;border-bottom:3px solid #000!important;text-transform:none!important;color:#000!important;">Running audit...</div>';
  loadingScreen.setAttribute(
    'style',
    'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background-color:rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;text-align:center;'
  );
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
      repeated += 1;
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
      altCount = 0,
      altText = [],
      filenameRe =
        /[^\s]+(\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|bmp|BMP|svg|SVG|webp|WEBP))/g,
      filenameWarnings = 0,
      titleWarnings = 0,
      emptyAltWarnings = 0,
      noAltWarnings = 0,
      imageWarnings = [],
      altImages = [],
      altImageIndex = 0;

    // Add classes to images based on presence of alt attr
    images.forEach(function (image, index) {
      let imageAlt = image.getAttribute('alt');
      if (image.hasAttribute('alt')) {
        image.classList.add('altAudit-hasAlt');
        image.setAttribute('data-altaudit-id', altImageIndex);
        altImages.push(image);
        altImageIndex++;
        // Get alt text and push it to altText array
        altCount++;
        if (imageAlt === '') {
          imageAlt = '(empty alt attribute)';
        }
        altText.push(imageAlt);
        let imageFilenameWarning =
          (imageTitleWarning =
          emptyAltWarning =
            false);
        // Check alt Text for Warnings

        // Filename warning
        if (imageAlt.match(filenameRe)) {
          filenameWarnings++;
          imageFilenameWarning = true;
          image.setAttribute('data-altAudit-image-filename-warning', 'true');
        } else if (imageAlt === '(empty alt attribute)') {
          emptyAltWarnings++;
          emptyAltWarning = true;
          image.setAttribute('data-altAudit-image-empty-alt-warning', 'true');
        } else {
          // Title/caption warning
          let altTextSiblings = getSiblings(image);
          altTextSiblings.forEach(sibling => {
            let outerHTML = sibling.outerHTML;
            if (
              sibling.tagName !== 'NOSCRIPT' &&
              sibling.tagName !== 'IMG' &&
              outerHTML.includes(imageAlt)
            ) {
              titleWarnings++;
              imageTitleWarning = true;
              image.setAttribute('data-altAudit-image-title-warning', 'true');
            }
          });
        }
        // Add warnings to imageWarnings array
        imageWarnings.push({
          filenameWarning: imageFilenameWarning,
          titleWarning: imageTitleWarning,
          emptyAltWarning: emptyAltWarning,
        });
      } else {
        noAltWarnings++;
        image.setAttribute('data-altAudit-image-no-alt-warning', 'true');
      }
    });

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
        letter-spacing: 0!important;
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
        width: 50%;
        padding: 0;
        right: 25px;
        height: 75%;
        bottom: 25px;
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

      #altAudit .text-large {
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

      #altAudit .results-label {
        font-size: 18px;
        font-weight: 400;
        text-wrap: pretty;
        color: #000!important;
        margin: 0 0 1em!important;
      }

      #altAudit .results-label strong {
        font-weight: 700;
      }

      #altAudit .results-label a {
        font-weight: 700;
        color: inherit!important;
        underline-offset: 0.02em;
        text-decoration: underline;
      }

      .altAudit-headline {
        font-weight: bold!important;
      }

      .altAudit-filenameWarningLabel span {
        padding: 0 0.1em;
        display: inline-block;
        background-color: #f6e533;
        font-weight: bold!important;
      }
      .altAudit-titleWarningLabel span {
        padding: 0 0.1em;
        display: inline-block;
        background-color: #f4b131;
        font-weight: bold!important;
      }
      .altAudit-emptyAltWarningLabel span {
        padding: 0 0.1em;
        display: inline-block;
        background-color: #CC88F6;
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
        scroll-gutter: stable;
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
        box-sizing: border-box!important;
        border: 8px dashed #1372f6!important;
      }
      .altAudit-highlighted[data-altAudit-image-filename-warning] {
        border: 8px dashed #f6e533!important;
      }
      .altAudit-highlighted[data-altAudit-image-title-warning] {
        border: 8px dashed #f4b131!important;
      }
      .altAudit-highlighted[data-altAudit-image-empty-alt-warning] {
        border: 8px dashed #CC88F6!important;
      }
      [data-altAudit-image-no-alt-warning] {
        border: 8px dashed #fc1d22!important;
      }

      .altAudit-altListItem {
        margin: 0!important;
        padding: 12px!important;
        font-size: 16px!important;
        cursor: pointer!important;
        border-bottom: 1px solid #000!important;
        counter-increment: list-counter!important;
      }
      .altAudit-altListItem span {
        display: inline-block;
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

      .altAudit-altListItem-filenameWarning span {
        padding: 8px!important;
        font-weight: bold!important;
        background-color: #f6e533!important;
      }
      .altAudit-altListItem-titleWarning span {
        padding: 8px!important;
        font-weight: bold!important;
        background-color: #f4b131!important;
      }
      .altAudit-altListItem-emptyAltWarning span {
        padding: 8px!important;
        font-weight: bold!important;
        background-color: #CC88F6!important;
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
        letter-spacing: 0!important;
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
    let percentage = Math.round((altCount / imageCount) * 100),
      percentageColor = percentage > 90 ? '#5dba59' : '#Fc6467';
    let percentageMessage = percentage + '%';
    if (percentage === 100) {
      percentageMessage += ' <span style="text-shadow:0 0 #000;">👍</span>';
    } else if (percentage < 90) {
      percentageMessage += ' <span style="text-shadow:0 0 #000;">👎</span>';
    }

    // Start building the report markup
    let reportMarkup =
      '<div id="altAudit-header"><h1 class="text-large" tabindex="0">Alt Audit</h1></div><div id="altAudit-overflowContainer"><p class="results-label"><strong>' +
      imageCount +
      '</strong> total images found, <strong>' +
      altCount +
      '</strong> alt attributes found. <span style="display:inline-block;padding:4px 6px;border-radius:6px;font-weight:700;background-color:' +
      percentageColor +
      ';">' +
      percentageMessage +
      '</span></p>';

    // If any warnings were found, let 'em know
    if (filenameWarnings > 0) {
      let hasHave = filenameWarnings > 1 ? 'have' : 'has';
      reportMarkup +=
        '<p class="results-label altAudit-filenameWarningLabel"><span>' +
        filenameWarnings +
        '</span> of those images ' +
        hasHave +
        ' alt text that appears to just be the image filename, and ' +
        hasHave +
        ' been <span class="altAudit-filenameWarningLabel">highlighted in yellow</span> below.</p>';
    }
    if (titleWarnings > 0) {
      let hasHave = titleWarnings > 1 ? 'have' : 'has';
      reportMarkup +=
        '<p class="results-label altAudit-titleWarningLabel"><span>' +
        titleWarnings +
        '</span> of those images ' +
        hasHave +
        ' alt text that may be the same as the image title or caption, and ' +
        hasHave +
        ' been <span class="altAudit-titleWarningLabel">highlighted in orange</span> below.</p>';
    }
    if (emptyAltWarnings > 0) {
      let hasHave = emptyAltWarnings > 1 ? 'have' : 'has';
      reportMarkup +=
        '<p class="results-label altAudit-emptyAltWarningLabel"><span>' +
        emptyAltWarnings +
        '</span> of those images ' +
        hasHave +
        " empty alt attributes, which is only valid if the image is truly <a href='https://www.w3.org/WAI/tutorials/images/decorative/' target='_blank'>decorative</a>. It's worth double-shecking, so they " +
        hasHave +
        ' been <span class="altAudit-emptyAltWarningLabel">highlighted in purple</span> below.</p>';
    }

    // If alt text was found, build a list
    if (altText.length > 0) {
      let altListMarkup = '';
      // Build each list item
      altText.forEach(function (image, index) {
        // Check for warnings
        let warning = (warningMessage = '');
        if (
          imageWarnings[index].filenameWarning ||
          imageWarnings[index].titleWarning ||
          imageWarnings[index].emptyAltWarning
        ) {
          if (imageWarnings[index].filenameWarning) {
            warning = ' altAudit-altListItem-filenameWarning';
            warningMessage =
              '<span class="visually-hidden">. Warning: this alt text appears to be just the image filename.</span>';
          } else if (imageWarnings[index].titleWarning) {
            warning = ' altAudit-altListItem-titleWarning';
            warningMessage =
              '<span class="visually-hidden">. Warning: this alt text appears to be the same as the image title or caption.</span>';
          } else if (imageWarnings[index].emptyAltWarning) {
            warning = ' altAudit-altListItem-emptyAltWarning';
            warningMessage =
              '<span class="visually-hidden">. Warning: this alt text is empty.</span>';
          }
        }
        altListMarkup +=
          '<li data-altaudit-matching-id="' +
          index +
          '" class="altAudit-altListItem' +
          warning +
          '"><span>' +
          image +
          '</span>' +
          warningMessage +
          '</li>';
      });

      reportMarkup +=
        '<p class="results-label">Here\'s all of the alt attributes we found:</p><ol id="altAudit-altList">' +
        altListMarkup +
        '</ol></div>';
    } else {
      // Nothing found — boo!
      reportMarkup +=
        '<div class="text-large">We didn\'t find any alt attributes on this page. You probably need to add some good alt text to your images, or in the case of <a href="https://www.w3.org/WAI/tutorials/images/decorative/" target="_blank">decroative images</a>, add empty alt attributes. (ex: <code>alt=""</code>)</div></div>';
    }

    // Add drag and close buttons and custom resize handle
    reportMarkup +=
      '<div id="altAudit-buttonGroup"><button id="altAudit-dragbar" style="position:relative;cursor: move;cursor: -webkit-grab;cursor: -moz-grab;margin-right:12px!important;padding:8px 8px 8px 26px!important;"><span style="position:absolute;bottom:15px;left:2px;font-weight:normal!important;font-size: 20px;line-height: 20px;color: #000;text-shadow: 0 5px #000, 0 10px #000, 5px 0 #000, 5px 5px #000, 5px 10px #000, 10px 0 #000, 10px 5px #000, 10px 10px #000;">.</span>move</button><button id="altAudit-close">close</button></div><div id="altAudit-resizeHandle"></div>';

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
      item.addEventListener('mouseenter', function () {
        highlightImage(item);
      });
      item.addEventListener('mouseleave', function () {
        removeImageHighlight(item);
      });
    });

    // Highlight Image
    function highlightImage(target, scrollToImage = false) {
      if (
        target.classList.contains('altAudit-altListItem') ||
        target.parentElement.classList.contains('altAudit-altListItem')
      ) {
        let highlightedImg = document.querySelector('.altAudit-highlighted');
        if (highlightedImg) {
          highlightedImg.style.border = 'none';
          highlightedImg.classList.remove('altAudit-highlighted');
        }

        // Get Target Image ID
        let targetImg;
        if (target.classList.contains('altAudit-altListItem')) {
          targetImg = document.querySelector(
            '[data-altaudit-id="' +
              target.getAttribute('data-altaudit-matching-id') +
              '"]'
          );
        } else if (
          target.parentElement.classList.contains('altAudit-altListItem')
        ) {
          targetImg = document.querySelector(
            '[data-altaudit-id="' +
              target.parentElement.getAttribute('data-altaudit-matching-id') +
              '"]'
          );
        }
        // Highlight it
        targetImg.classList.add('altAudit-highlighted');
        // Scroll to the image if clicked
        if (scrollToImage) {
          targetImg.scrollIntoView({ block: 'center' });
        }
      }
    }
    // Remove Image Highlight
    function removeImageHighlight(target) {
      let targetImg = document.querySelector(
        '[data-altaudit-id="' +
          target.getAttribute('data-altaudit-matching-id') +
          '"]'
      );
      targetImg.classList.remove('altAudit-highlighted');
    }

    // Trap Focus in Report
    const focusableElements =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const firstFocusableElement =
      altAudit.querySelectorAll(focusableElements)[0]; // get first element to be focused inside altAudit
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
    // adapted from Stef Williams: https://codepen.io/ramenhog/pen/gmGzRQ
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

        if (
          newReportTop < offset ||
          newReportLeft < offset ||
          newReportTop + reportHeight > containerHeight - offset ||
          newReportLeft + reportWidth > containerWidth - offset
        ) {
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

  // Helper function for grabbing element siblings
  // plucked from Chris Ferdinandi: https://gomakethings.com/how-to-get-all-of-an-elements-siblings-with-vanilla-js/
  function getSiblings(elem) {
    // Setup siblings array and get the first sibling
    var siblings = [];
    var sibling = elem.parentNode.firstChild;
    // Loop through each sibling and push to the array
    while (sibling) {
      if (sibling.nodeType === 1 && sibling !== elem) {
        siblings.push(sibling);
      }
      sibling = sibling.nextSibling;
    }

    return siblings;
  }
}
