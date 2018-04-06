// function generateMagnetURL(movieObj){
//   const trackers = [
//     "udp://open.demonii.com:1337/announce",
//     "udp://tracker.openbittorrent.com:80",
//     "udp://tracker.coppersurfer.tk:6969",
//     " udp://glotorrents.pw:6969/announce",
//     "udp://tracker.opentrackr.org:1337/announce",
//     "udp://torrent.gresille.org:80/announce",
//     "udp://p4p.arenabg.com:1337",
//     "udp://tracker.leechers-paradise.org:6969"
//   ]
//   var magnetStr = "magnet:?xt=urn:btih:";
//   magnetStr += movieObj.torrents.filter(tor=>{
//     return tor.quality === "1080p";
//   })[0].hash;
//   magnetStr += "&dn="+encodeURIComponent(movieObj.title_long);
//   trackers.forEach(tracker=>{
//     magnetStr += "&tr="+tracker;
//   })
//   return magnetStr;
// }
