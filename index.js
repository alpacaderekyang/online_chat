var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var dbClient = require('mongodb').MongoClient;
var assert = require('assert');

// app.get('/', function(req, res){
//   //res.sendFile('/home/cycnico/Desktop/Web/socket/index.html');
//   res.sendFile(__dirname + '/index.html');
// });

app.use(express.static(__dirname));

//var url = 'mongodb://admin:123@ds145289.mlab.com:45289/eslab1db';
var url = 'mongodb://derek:850211@ds145359.mlab.com:45359/eslab1_db';

var numUsers = 0;
var numGuests = 0;
const clientlist = []; //global variable

io.on('connection', function(socket) {

  dbClient.connect(url, function (err, db) {

    console.log("Connected sucessfully to database.");

    var profiles = db.collection('userProfile');
    var records = db.collection('talkingRecord');
    var userpassword = "";


    socket.on('guest login',function(){
      numGuests+=1;
      if(numGuests==1){ socket.username = "guest"; }
      else{
        socket.username = "guest";
        socket.username += numGuests;
      }
      socket.emit('set guestnum',numGuests);
      adduser();
    });

    socket.on('user login',function(profile){
      checkuser(profile);
      findRecords(db, function (docs) {

        if (docs.length!=0){
          for (var i in docs) {
            addrecord(docs[i]);
          }
        }
      });//end of findRecords
    });

    socket.on('chat message', function(msg){
      console.log(socket.username+":"+msg);
      var mytime = mygetTime();
      io.emit('chat message', {
         u_name: socket.username,
         u_word: msg,
         u_time: mytime
      });
      records.insert({ u_name:socket.username, u_word:msg , u_time:mytime }); //insert record to db.
    });

    socket.on('disconnect', function(){
      console.log(socket.username+" left.");
      io.emit('user left',{
         username: socket.username
      });
      io.emit('update userlist', getuserlist());
    });

    //functions
    var checkuser = function (user) {
        var userlist = getuserlist();
        for (let i = 0; i < userlist.length; i += 1) {
          if(userlist[i] == user.username){
            socket.emit('relogin');
          }
        }

        profiles.find({username: user.username}).toArray(function(err,temp){
        if(temp.length!=0){
          userpassword = temp[0].password;
          if(userpassword == user.userpassword) {
            socket.username = user.username;
            console.log("user '"+socket.username+"' login sucessful");
            adduser();
          }
          else {
            console.log("wrong password");
            socket.emit('wrong password');
          }
        }
        else { //update user profile to the db
          profiles.insert({ username:user.username, password:user.userpassword});
          socket.username = user.username;
          console.log("new user '"+socket.username+"' sign up");
          adduser();
        }
      });
    };//end of checkuser


    var adduser = function(){
      console.log("new user:"+socket.username+" connected.");
      clientlist.push(socket);
      io.emit('add user',{
          username: socket.username
      });
      io.emit('update userlist', getuserlist());
    };

    var getuserlist = function() {
      const usersList = [];
      for (let i = 0; i < clientlist.length; i += 1) {
        usersList[i] = clientlist[i].username;
        //console.log(usersList[i]);
      }
      return usersList;
    };

    var findRecords = function (db, callback) {
      //var records = db.collection('talkingRecord');
      records.find({}).toArray(function (err, docs) {
        callback(docs);
      });
    };

    var addrecord = function(data){
      //console.log( data.u_name+":"+data.u_word+"...is already in db" );
      socket.emit('add record',{
          u_name: data.u_name,
          u_word: data.u_word,
          u_time: data.u_time
      });
    };

    function mygetTime(){
            var Today=new Date();
            var str1 =   Today.getFullYear()+"/"+(Today.getMonth()+1)+"/"+Today.getDate();

            var myhour = Today.getHours();
            var myminute = Today.getMinutes();
            var mysecond = Today.getSeconds();
            if (myhour<10)  myhour = "0"+myhour;
            if (myminute<10)  myminute = "0"+myminute;
            if (mysecond<10)  mysecond = "0"+mysecond;

            var str2 = myhour +":"+myminute+":"+mysecond;
            return str1+" "+str2;
    };


  }); //end database
}); //end io

http.listen(3000, function(){
  console.log('listening on *:3000');
});
