const socket = io();
socket.on('connect', () => {
});

socket.on('message', (data) => {
  console.log(data);
});
