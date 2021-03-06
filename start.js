var express = require('express');           // For web server
const fetch = require('node-fetch');
const routes = require('./routes/apiCalls');

// Set up Express web server
var app = express();
app.use(express.json());
app.use(express.static(__dirname + '/www'));
//Use routes
app.use('/', routes);

// Server listening on port 3000
app.set('port', 3000);
var server = app.listen(app.get('port'), function () {
    console.log('Server listening on port ' + server.address().port);
});

//-------------------------------------------------------------------
// Configuration for your Forge account. Initialize the 2-legged OAuth2 client, and set specific scopes
//-------------------------------------------------------------------
var FORGE_CLIENT_ID = 'OUuhvY15Ev5liacsBbJxPWIIxkJ9tsEy';
var FORGE_CLIENT_SECRET = 's8q0iTPzFWGCT59N';
var access_token = '';
var scopes = 'data:read data:write data:create bucket:create bucket:read bucket:update';
const querystring = require('querystring');

// Route /api/forge/oauth
app.get('/api/forge/oauth/nuevo', async (request, response) => {
    //console.log(request.body);
    const options = {
        method: 'POST',
        url: 'https://developer.api.autodesk.com/authentication/v1/authenticate',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: querystring.stringify({
            client_id: FORGE_CLIENT_ID,
            client_secret: FORGE_CLIENT_SECRET,
            grant_type: 'client_credentials',
            scope: scopes
        })
    };
    try {
        const askingToken = await fetch(options.url, options);
        const token = await askingToken.json();
        access_token = token.access_token;
        console.log(token, 'This is the response.');
        response.redirect('/api/forge/datamanagement/bucket/create/nuevo');
    } catch (error) {
        console.error(error);
        response.send('Failed to authenticate');
    }
});

// Route /api/forge/oauth/public/nuevo
app.get('/api/forge/oauth/public/nuevo', async (request, response) => {
    // Limit public token to Viewer read only
    const options = {
        method: 'POST',
        url: 'https://developer.api.autodesk.com/authentication/v1/authenticate',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
        },
        body: querystring.stringify({
            client_id: FORGE_CLIENT_ID,
            client_secret: FORGE_CLIENT_SECRET,
            grant_type: 'client_credentials',
            scope: 'viewables:read'
        })
    };
    try {
        const authenticatingIdentity = await fetch(options.url, options);
        const authenticatingIdentityJson = await authenticatingIdentity.json();
        // Success
        //console.log(authenticatingIdentityJson);
        response.json({ access_token: authenticatingIdentityJson.access_token, expires_in: authenticatingIdentityJson.expires_in });
    } catch (error) {
        // Failed
        console.log(error);
        response.status(500).json(error);
    }
});


// Buckey key and Policy Key for OSS
const key = 'OUuhvY15Ev5liacsBbJxPWIIxkJ9tsEy';
// Prefix with your ID so the bucket key is unique across all buckets on all other accounts
const bucketKey = key.toLowerCase() + '_new_bucket';
const policyKey = 'transient'; // Expires in 24hr

// Route /api/forge/datamanagement/bucket/create/nuevo
app.get('/api/forge/datamanagement/bucket/create/nuevo', async (request, response) => {
    // Create an application shared bucket using access token from previous route
    const options = {
        method: 'POST',
        url: 'https://developer.api.autodesk.com/oss/v2/buckets',
        headers: {
            'content-type': 'application/json',
            Authorization: 'Bearer ' + access_token
        },
        body: JSON.stringify({
            'bucketKey': bucketKey,
            'policyKey': policyKey
        })
    };
    try {
        const askingNewBucket = await fetch(options.url, options);
        console.log(response);
        response.redirect('/api/forge/datamanagement/bucket/detail/nuevo');

    } catch (error) {
        if (error.response && error.response.status == 409) {
            console.log('Bucket already exists, skip creation.');
            res.redirect('/api/forge/datamanagement/bucket/detail/nuevo');
        }
        // Failed
        console.log(error);
        res.send('Failed to create a new bucket')
    }
});

// Route /api/forge/datamanagement/bucket/detail/nuevo
app.get('/api/forge/datamanagement/bucket/detail/nuevo', async (request, response) => {
    const options = {
        method: 'GET',
        url: 'https://developer.api.autodesk.com/oss/v2/buckets/' + encodeURIComponent(bucketKey) + '/details',
        headers: {
            Authorization: 'Bearer ' + access_token
        }
    };
    try {
        const checkingForBucket = await fetch(options.url, options);
        // Success
        console.log(response);
        response.redirect('/upload.html');
    } catch (error) {
        // Failed
        console.log(error);
        res.send('Failed to verify the new bucket');
    }
});

// For converting the source into a Base64-Encoded string
var Buffer = require('buffer').Buffer;
String.prototype.toBase64 = function () {
    // Buffer is part of Node.js to enable interaction with octet streams in TCP streams, 
    // file system operations, and other contexts.
    return new Buffer.from(this).toString('base64');
};

var multer = require('multer');         // To handle file upload
var upload = multer({ dest: 'tmp/' }); // Save file into local /tmp folder

// Route /api/forge/datamanagement/bucket/upload
app.post('/api/forge/datamanagement/bucket/upload/nuevo', upload.single('fileToUpload'), function (req, res) {
    var fs = require('fs'); // Node.js File system for reading files
    fs.readFile(req.file.path, async function (err, filecontent) {
        const options = {
            method: 'PUT',
            url: 'https://developer.api.autodesk.com/oss/v2/buckets/' + encodeURIComponent(bucketKey) + '/objects/' + encodeURIComponent(req.file.originalname),
            headers: {
                Authorization: 'Bearer ' + access_token,
                'Content-Disposition': req.file.originalname,
                'Content-Length': filecontent.length
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            body: filecontent
        };
        try {
            const uploadFile = await fetch(options.url, options);
            const translatedFile = await uploadFile.json();
            var urn = translatedFile.objectId.toBase64();
            /*
            const manifest = await fetch(`https://developer.api.autodesk.com/modelderivative/v2/designdata/${urn}/manifest`, {
                headers: { Authorization: 'Bearer ' + access_token }
            });
            const manifestJson = await manifest.json();
            console.log(translatedFile, manifestJson);*/
            res.redirect('/api/forge/modelderivative/' + urn);
        } catch (error) {
            // Failed
            console.log(error);
            res.send('Failed to create a new object in the bucket');
        }
    });
});

// Route /api/forge/modelderivative/nuevo
app.get('/api/forge/modelderivative/:urn', async (req, res) => {
    var urn = req.params.urn;
    var format_type = 'svf';
    var format_views = ['2d', '3d'];
    const options = {
        method: 'POST',
        url: 'https://developer.api.autodesk.com/modelderivative/v2/designdata/job',
        headers: {
            'content-type': 'application/json',
            Authorization: 'Bearer ' + access_token
        },
        body: JSON.stringify({
            'input': {
                'urn': urn/*,
                'compressedUrn': true,
                'rootFilename': 'prueba.rvt'*/
            },
            'output': {
                'formats': [
                    {
                        'type': format_type,
                        'views': format_views
                    }
                ]
            }
        })
    };
    try {
        const modelDerivativeApiCall = await fetch(options.url, options);
        const response = await modelDerivativeApiCall.json();
        // Success
        //console.log(response);
        res.redirect('/viewer.html?urn=' + urn);
    } catch (error) {
        // Failed
        console.log(error);
        res.send('Error at Model Derivative job.');
    }
});
