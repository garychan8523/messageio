"use strict";

var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io').listen(server);

var listenport = 8080;
server.listen(8080);
console.log('server listen on: ', listenport);

// routing
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

// usernames which are currently connected to the chat
var usernames = {};

// rooms which are currently available in chat
var rooms = ['Room 1','Room 2','Room 3'];

io.sockets.on('connection', function (socket) {
	
	// when the client emits 'adduser', this listens and executes
	socket.on('adduser', function(username){
		// store the username in the socket session for this client
		socket.username = username;
		// store the room name in the socket session for this client
		socket.room = rooms[0];
		// add the client's username to the global list
		usernames[username] = username;
		// send client to room 1
		socket.join(rooms[0]);
		// echo to client they've connected
		socket.emit('updatechat', 'SERVER', 'you have connected to room1');
		// echo to room 1 that a person has connected to their room
		socket.broadcast.to(rooms[0]).emit('updatechat', 'SERVER', username + ' (' + socket.id + ') has connected to this room');
		socket.emit('updateRooms', rooms, rooms[0]);
	});
	
	// when the client emits 'sendchat', this listens and executes
	socket.on('sendchat', function (data) {
		// we tell the client to execute 'updatechat' with 2 parameters
		io.sockets.in(socket.room).emit('updatechat', socket.username, data);
	});

	socket.on('switchRoom', function(targetRoom){
		socket.leave(socket.room);
		socket.join(targetRoom);
		socket.emit('updatechat', 'SERVER', 'you have connected to '+ targetRoom);
		socket.broadcast.to(socket.room).emit('updatechat', 'SERVER', socket.username+' has left this room');
		socket.room = targetRoom;
		socket.broadcast.to(targetRoom).emit('updatechat', 'SERVER', socket.username+' has joined this room');
		socket.emit('updateRooms', rooms, socket.room);
	});

	socket.on('addRoom', function(newRoom){
		if (rooms.indexOf(newRoom) === -1){
        	rooms.push(newRoom);
        	for(var room in rooms){
				io.to(rooms[room]).emit('updateRooms', rooms, rooms[room]);
			}
        }else{
        	socket.emit('sys_message', 'SERVER', "can't create room: name existed");
        }
	});

	socket.on('displayUserRoom', function(){
		for(var room in rooms){
			io.to(rooms[room]).emit('sys_message', 'SERVER', 'you are in room: ' + rooms[room]);
		}
	});

	// when the user disconnects.. perform this
	socket.on('disconnect', function(){
		// remove the username from global usernames list
		delete usernames[socket.username];
		// update list of users in chat, client-side
		io.sockets.emit('updateusers', usernames);
		// echo globally that this client has left
		socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
		socket.leave(socket.room);
	});
});
