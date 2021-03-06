
var express = require('express');       
var app = module.exports = express();
var fs = require('fs');
var im = require('imagemagick');
var child_process = require('child_process');
var exec = require('child_process').exec;

var http = require( 'http' );
var server = http.createServer(app);

var io = require('socket.io').listen(server);
server.listen(3434);

app.use(express.bodyParser());

var music_home = "/home/pi/RaspMedia/music/";
var photo_home = "/home/pi/RaspMedia/photos/";
var video_home = "/home/pi/RaspMedia/videos/";
var web_home = "/home/pi/RaspMedia/serverCode/web";


app.get('/', function(req,res) {
    res.sendfile(web_home + '/pc.html');
});

app.get('/tick_icon', function(req,res) {
    res.sendfile(web_home + '/tick_icon.png');
});

app.get('/jquery.js', function(req,res) {
    res.sendfile(web_home + '/jquery.js');
});

app.get('/background', function(req,res) {
    res.sendfile(web_home + '/back2.jpg');
});

app.get('/bootstrap', function(req,res) {
    res.sendfile(web_home + '/bootstrap.css');
});

app.get('/rasp_logo', function(req,res) {
    res.sendfile(web_home + '/smalllogo.png');
});

var uploaded_files = [];

io.on("connection", function ( socket ){ 


    app.post('/upload_web', function ( req, res ){
            
        console.log("Uploading file...");
        /* inicializo como other, y si es elgun otro tipo lo cambio */     
        var Dir;
        console.log(req);
        var typeFile = req.files.source.type;
        var fileName = req.files.source.name;
        var filePath = req.files.source.path;

        if( typeFile.indexOf( "image" ) >= 0 ) {
            Dir = photo_home;
        }
        else if( typeFile.indexOf( "video" ) >= 0) {
            Dir = video_home;
        }
        else if( typeFile.indexOf( "audio" ) >= 0) {
            Dir = music_home;
        }
        
        fs.rename( filePath, 
            Dir+fileName ,
            function( err ){
                if( err ){
                    console.log( err )
                } 
                else {
                    if( Dir == photo_home ) { //si es una foto, redimensiona
                        var options = {
                            width: 200,
                            height: 200,
                            srcPath: Dir+fileName,
                            dstPath: photo_home+'min/'+fileName                        
                        };

                    	im.crop( options, function ( err ) {
                        	if( err ) throw err;
                    	});
                    }
                    res.redirect("back");
            	}
        });
    });

    socket.on("load_files", function() {
        io.sockets.emit("send_loadeds",uploaded_files);
    });

    socket.on("loadFile", function (nameFile) {
        uploaded_files.push(nameFile);
    });

    socket.on("delete_files", function (array) {
        var cont_rm = 0;
        for (var i = 0; i < array.length; i++) {
            var nom_act = array[i];
            if(nom_act.indexOf(".jpeg") != -1 || nom_act.indexOf(".jpg") != -1 || nom_act.indexOf(".png") != -1 ) {
                child = child_process.spawn('rm', [photo_home+nom_act]);     
                child = child_process.spawn('rm', [photo_home+'min/'+nom_act]);     
                ++cont_rm;
            }
            else if(nom_act.indexOf(".mp3") != -1 ) {
                child = child_process.spawn('rm', [music_home+nom_act]);                  
                ++cont_rm;
            } 
            else if (nom_act.indexOf(".mp4") != -1 || nom_act.indexOf(".mpeg") != -1 ) {
                child = child_process.spawn('rm', [video_home+nom_act]);  
                ++cont_rm;
            }
        }
        child.on('exit', function() {            
            if (cont_rm == array.length) refresh_page(); 
        });
    });

    var cont;

    var music = [];
    var photos = [];
    var videos = [];

    function emit_socket() {
        if (cont == 3) {                
            io.sockets.emit("send_files", music,photos,videos);
        }
    }

    function send_files() {

        cont = 0;

        music = [];
        photos = [];
        videos = [];

        fs.readdir(photo_home, function(err,files) {
            if(err) throw err;
            files.forEach(function(file) {
                if(file.indexOf(".jpeg") != -1 || file.indexOf(".jpg") != -1 || 
                        file.indexOf(".png") != -1 ) {
                    photos.push(file);
                }
            });
            ++cont;
            emit_socket();
        });


        fs.readdir(music_home, function(err,files) {
            if(err) throw err;
            files.forEach(function(file) {
                if(file.indexOf(".mp3") != -1 ) {
                    music.push(file);
                }
            });
            ++cont;
            emit_socket();
        });


        fs.readdir(video_home, function(err,files) {
            if(err) throw err;
            files.forEach(function(file) {
                if(file.indexOf(".mp4") != -1 || file.indexOf(".mpeg") != -1 ) {
                    videos.push(file);
                }
            });
            ++cont;
            emit_socket();
        });
    }

    function refresh_page() {
        io.sockets.emit("refresh");
    }

    socket.on("load_files", function() {
        send_files();
    });
});
