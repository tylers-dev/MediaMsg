var request = require('request');

const http = require('http');
const express = require('express');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const PORT = process.env.PORT || 3000;

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

app.listen(PORT, () => console.log(`Listening on ${ PORT }`))
// http.createServer(app).listen(3000, () => {
//   console.log('Express server listening on port 3000');
// });

//ANSWER TEXT MESSAGE /////////////////////////////////////////////////////////////////////////////////
function textMessageAnswer(textMessage, cookies, cb){
  var cookie_mediaResult = cookies.mediaResult;
  console.log("cookie_mediaResult", cookie_mediaResult)
  if(textMessage[0].match(/[1-9]/) != null){
    //Selection response - text message is responding with a selection number
    if(!cookie_mediaResult) return false;
    var mediaResult = JSON.parse(cookie_mediaResult);
    var selections = textMessage.split(/[ ,]+/).join('').split('').map(n=>{
      return mediaResult[parseInt(n-1)] || null;
    }).filter(n => n);
    selections.forEach(movie=>{
      downloadMedia(movie.url, function(success){
        if(success){
          var downloadingMessage = "Downloading...\n" + selections.map(x=>{return (x.title)}).join(" and ") + "\nPlease allow 10-15mins for download to complete.";
          cb(downloadingMessage, "");
        }else{
          cb("Oops system isn't ready to download. Please try again later.", "");
        }
      })
    })
  }
  else{
    //The text message is a word or non-numeric character
    findMedia(textMessage, function(media){
      //Movie not found on YTS
      if(!media) return failMsg();
      var qualityPriority = ["1080p", "720p"];
      media = media.slice(0,9);
      media = media.reduce((result, movie)=>{
        if(movie.title_long && movie.torrents){
          var newMovieObj = {
            "title":movie.title_long,
            "url": movie.torrents.sort(function(a,b){
                      //Find the highest quality torrent
                    	if(qualityPriority.indexOf(a.quality) === -1) return 1;
                    	return qualityPriority.indexOf(a.quality) > qualityPriority.indexOf(b.quality);
                    })[0].url
          };
          if(newMovieObj.title && newMovieObj.url){
            result.push(newMovieObj)
            return result;
          }
        }
      }, [])
      if(!media) return failMsg();
      var message = "\nPlease respond with a number from the list below:\n";
      for(var i=0; i<media.length; i++){
        message += "["+(i+1)+"] "+media[i].title+"\n";
      }
      cb(message, JSON.stringify(media))
      function failMsg(){
        cb("Sorry no movie was found for: "+textMessage);
        return false;
      }
    });
  }
}

//YTS API - FINDS MEDIA//////////////////////////////////////////////////////////////////////////////////
function findMedia(title, cb){
  request({
    url: "https://yts.am/api/v2/list_movies.json?"+"query_term="+title,
    json: true
  }, function(error, response, body) {
    var movies = body.data || undefined;
    if(movies) movies = body.data.movies || undefined;
    cb(movies);
  });
}

//QBITTORRENT CLIENT - DOWNLOADS MEDIA//////////////////////////////////////////////////////////////////////////////////
var qBittorrent  = require('qbittorrent-client').API3
var client = new qBittorrent({
  username: 'admin',
  password: 'a88d0778-198b-4cfd-a305-03ecd45b1457',
  host: '136.63.71.226',
  port: 8085
})
function downloadMedia(url, cb){
  client.addTorrentFromURL({urls:url}, function(err, body){
    cb(true);
  })
}
//
// downloadMedia("https://yts.am/torrent/download/90194CDADF77F6A0E1141670F61BAADA17EA8B37", function(error){
//   console.log("dgsdgsdg", error)
// })

//SEARCH OMDB FOR MOVIE INFORMATION//////////////////////////////////////////////////////////////////////////////////
// const OmdbApi = require('omdb-api-pt')
//
// // Create a new instance of the module.
// const omdb = new OmdbApi({apiKey:"cc9ab314"});
// omdb.bySearch({
//   search: 'saw',
//   type: 'movie'
// }).then(res => console.log(res))
//   .catch(err => console.error(err))
