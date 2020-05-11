var viewer;
import 'https://code.jquery.com/jquery-3.3.1.min.js';
import 'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js';
var options = {
  env: 'AutodeskProduction',
  api: 'derivativeV2', // TODO: for models uploaded to EMEA change this option to 'derivativeV2_EU'
  getAccessToken: getForgeToken,
};
var documentId = 'urn:' + getUrlParameter('urn');

// Run this when the page is loaded
Autodesk.Viewing.Initializer(options, function onInitialized() {
  // Find the element where the 3d viewer will live.
  var htmlElement = document.getElementById('MyViewerDiv');
  if (htmlElement) {
    // Create and start the viewer in that element
    viewer = new Autodesk.Viewing.GuiViewer3D(htmlElement);
    viewer.start();
    // Load the document into the viewer.
    Autodesk.Viewing.Document.load(
      documentId,
      onDocumentLoadSuccess,
      onDocumentLoadFailure
    );
  }
});

/**
 * Autodesk.Viewing.Document.load() success callback.
 * Proceeds with model initialization.
 */
function onDocumentLoadSuccess(doc) {
  // Load the default viewable geometry into the viewer.
  // Using the doc, we have access to the root BubbleNode,
  // which references the root node of a graph that wraps each object from the Manifest JSON.
  var viewable = doc.getRoot().getDefaultGeometry();
  if (viewable) {
    viewer
      .loadDocumentNode(doc, viewable)
      .then(function (result) {
        console.log('Viewable Loaded!');
      })
      .catch(function (err) {
        console.log('Viewable failed to load.');
        console.log(err);
      });
  }
}

/**
 * Autodesk.Viewing.Document.load() failure callback.
 */
function onDocumentLoadFailure(viewerErrorCode) {
  console.error('onDocumentLoadFailure() - errorCode: ' + viewerErrorCode);
  jQuery('#MyViewerDiv').html(
    '<p>Translation in progress... Please try refreshing the page.</p>'
  );
}

// Get Query string from URL,
// we will use this to get the value of 'urn' from URL
function getUrlParameter(name) {
  name = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]');
  var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
  var results = regex.exec(location.search);
  return results === null
    ? ''
    : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Get public access token for read only,
// using ajax to access route /api/forge/oauth/public in the background
function getForgeToken(callback) {
  jQuery.ajax({
    url: '/api/forge/oauth/public/nuevo',
    success: function (res) {
      callback(res.access_token, res.expires_in);
    },
  });
}
