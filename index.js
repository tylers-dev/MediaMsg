var request = require('request');
var Client = require('utorrent-api');

const http = require('http');
const express = require('express');
const MessagingResponse = require('twilio').twiml.MessagingResponse;

const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(cookieParser());

app.post('/sms', (req, res) => {
  const twiml = new MessagingResponse();
  textMessageAnswer(req.body.Body, req.cookies, function(answer, cookie){
    res.cookie('mediaResult', cookie);
    twiml.message(answer);
    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(twiml.toString());
  })
});

http.createServer(app).listen(3000, () => {
  console.log('Express server listening on port 3000');
});

//ANSWER TEXT MESSAGE /////////////////////////////////////////////////////////////////////////////////
function textMessageAnswer(textMessage, cookies, cb){
  var cookie_mediaResult = cookies.mediaResult;
  if(textMessage[0].match(/[1-9]/) != null){
    //Selection response - text message is responding with a selection number
    if(!cookie_mediaResult) return false;
    var mediaResult = JSON.parse(cookie_mediaResult);
    var selections = textMessage.split(/[ ,]+/).join('').split('').map(n=>{
      return mediaResult[parseInt(n-1)] || null;
    }).filter(n => n);
    selections.forEach(movie=>{
      downloadMedia(movie.url)
    })
    var downloadingMessage = "Downloading...\n" + selections.map(x=>{return (x.title)}).join(" and ") + "\nPlease allow 10-15mins for download to complete.";
    cb(downloadingMessage, "");
  }
  else{
    //The text message is a word or non-numeric character
    findMedia(textMessage, function(media){
      //Movie not found on YTS
      if(!media) {
        cb("Sorry no movie was found for: "+textMessage);
        return false;
      }
      media = media.slice(0,9);
      media = media.map(m=>{
        return {
          "title":m.title_long,
          "url":(function(){
            var highestQualityTorrent;
            //1080p
            highestQualityTorrent = m.torrents.filter(t=>{return t.quality==="1080p"});
            if(highestQualityTorrent.length>0) return highestQualityTorrent[0].url;
            //720p
            highestQualityTorrent = m.torrents.filter(t=>{return t.quality==="720p"});
            if(highestQualityTorrent.length>0) return highestQualityTorrent[0].url;
            //Other
            return m.torrents.url;
          })()
        }
      })
      var message = "\nPlease respond with a number from the list below:\n";
      for(var i=0; i<media.length; i++){
        message += "["+(i+1)+"] "+media[i].title+"\n";
      }
      cb(message, JSON.stringify(media))
    });
  }
}
//YTS API - FINDS MEDIA//////////////////////////////////////////////////////////////////////////////////
function findMedia(title, cb){
  request({
    url: "https://yts.am/api/v2/list_movies.json?"+"query_term="+title,
    json: true
  }, function(error, response, body) {
    cb(body.data.movies || undefined);
  });
}

//UTORRENT CLIENT - DOWNLOADS MEDIA//////////////////////////////////////////////////////////////////////////////////
var utorrent = new Client('localhost', '22222');
utorrent.setCredentials('admin', '971ef964-471f-4ea8-b868-0a5163d222a1');
function downloadMedia(url){
  request({'uri' : url, 'encoding': null}, function (error, response, torrentFileBuffer) {
      utorrent.call('add-file', {'torrent_file': torrentFileBuffer}, function(err, data) {
          if(err) { console.log('error : '); console.log(err); return; }
          console.log('Successfully added torrent file !');
          console.log(data);
      });
  });
}
// utorrent.call('list', function(err, torrents_list) {
//     if(err) { console.log(err); return; }
//     var torrents = torrents_list.torrents;
//     torrents.forEach(torrent=>{
//       console.log("Remaining bytes", torrent[18]);
//     })
// });
