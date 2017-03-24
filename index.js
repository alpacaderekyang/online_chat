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

io.on('connection', function(socket) {

  dbClient.connect(url, function (err, db) {

    console.log("Connected sucessfully to database.");

    socket.on('guest login',function(){
      numGuests+=1;
      if(numGuests==1){ socket.username = "guest"; }
      else{
        socket.username = "guest";
        socket.username += numGuests;
      }
    	adduser();
    });
    
  
    var profiles = db.collection('userProfile');
    var userpassword = "";
    var records = db.collection('talkingRecord');

    socket.on('user login',function(profile){
      checkuser(profile);

      findRecords(db, function (docs) {
        //console.log("Found the following records : ");
        for (var i in docs) {
          addrecord(docs[i]);
        }
      });//end of findRecords  //might crash when no records
    });

    var findRecords = function (db, callback) {
      //var records = db.collection('talkingRecord');

        records.find({}).toArray(function (err, docs) {
        callback(docs);
      });
    }




	  socket.on('chat message', function(msg){
		  console.log(socket.username+":"+msg);
		  io.emit('chat message', {
			   username: socket.username,
			   msg: msg
		  });
      records.insert({ u_name:socket.username, u_word:msg}); //insert record to db.
	  });

	  socket.on('disconnect', function(){
		  console.log(socket.username+" left.");
		  io.emit('user left',{
			   username: socket.username
		  });
	  });

    var checkuser = function (user) {
        profiles.find({username: user.username}).toArray(function(err,temp){
        //console.log(temp);
        if(temp.length!=0){
          userpassword = temp[0].password;
          if(userpassword==user.userpassword) {  
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
    
    //var showrecord = function (user){};

   
    var adduser = function(){
      console.log("new user:"+socket.username+" connected.");

      io.emit('add user',{
          username: socket.username
      });
    };

    var addrecord = function(data){
      //console.log( data.u_name+":"+data.u_word+"...is already in db" );
      io.emit('add record',{
          u_name: data.u_name,
          u_word: data.u_word
      });
    };
  }); //end database

}); //end io

http.listen(3000, function(){
  console.log('listening on *:3000');
});



//mytest