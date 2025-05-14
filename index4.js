const mqtt = require('mqtt');
const axios = require('axios');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

// // MQTT Setup
// const client = mqtt.connect('mqtt://mqtt.eclipseprojects.io');
// const topic = 'padEase/JG25001/stock/request';
// const responseTopic = 'padEase/JG25001/stock/response';
// const padEaseId = '680b619869560b1945b83dce';
// const machineCode = 'JG25001';

// clients.on('connect', () => {
//   console.log('Connected to MQTT broker.');

//   client.subscribe(topic, (err) => {
//     if (!err) {
//       console.log(`Subscribed to topic: ${topic}`);
//     } else {
//       console.error(`Failed to subscribe: ${err.message}`);
//     }
//   });
// });

// client.on('message', async (receivedTopic, message) => {
//   console.log(`Received message from ${receivedTopic}: ${message.toString()}`);

//   try {
//     const response = await axios.get(`https://vendingao-api.xyz/api/v1/pad/active/${padEaseId}`);
//     const pads = response.data?.data || [];

//     const stockMessage = `*padEase,${machineCode},` +
//       pads.map(pad => `S${pad.padNumber}:${pad.stock}`).join(',') + '#';

//     console.log(`Formatted stock message: ${stockMessage}`);
//     client.publish(responseTopic, stockMessage);

//   } catch (error) {
//     console.error('Error fetching pad stock:', error.message);
//   }
// });

// HTTP route to verify the app is running
app.get('/', (req, res) => {
  res.send('MQTT stock listener is running........');
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
