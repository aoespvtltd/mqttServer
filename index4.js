const mqtt = require('mqtt');
const axios = require('axios');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

// MQTT Setup
const client = mqtt.connect('mqtt://mqtt.eclipseprojects.io');
const topic = 'JG25001/server';
const responseTopic = 'JG25001/device';
const padEaseId = '680b619869560b1945b83dce';
const machineCode = 'JG25001';

let heartbeatTimeout = null;
let isMachineActive = null; // To prevent repeated PATCH calls

const setMachineStatus = async (status) => {
  if (isMachineActive === status) return; // Avoid redundant requests

  isMachineActive = status;
  try {
    await axios.patch(`https://vendingao-api.xyz/api/v1/padEase/name/${machineCode}`, {
      status: status,
    });
    console.log(`Machine status updated to: ${status ? 'active' : 'inactive'}`);
  } catch (err) {
    console.error(`Failed to update machine status: ${err.message}`);
  }
};

const resetHeartbeatTimer = () => {
  if (heartbeatTimeout) clearTimeout(heartbeatTimeout);

  heartbeatTimeout = setTimeout(() => {
    console.log('Machine inactive (no heartbeat received in 60s).');
    setMachineStatus(false);
  }, 60 * 1000); // 1 minute
};

const sendStockMessage = async () => {
  try {
    const response = await axios.get(`https://vendingao-api.xyz/api/v1/pad/active/${padEaseId}`);
    const pads = response.data?.data || [];

    const stockMessage = `*padEase,${machineCode},` +
      pads.map(pad => `S${pad.padNumber}:${pad.stock}`).join(',') + 'y#';

    console.log(`Formatted stock message: ${stockMessage}`);
    client.publish(responseTopic, stockMessage);
  } catch (error) {
    console.error('Error fetching pad stock:', error.message);
  }
};

client.on('connect', () => {
  console.log('Connected to MQTT broker.');

  client.subscribe(topic, (err) => {
    if (!err) {
      console.log(`Subscribed to topic: ${topic}`);
    } else {
      console.error(`Failed to subscribe: ${err.message}`);
    }
  });
});

client.on('message', async (receivedTopic, message) => {
  const messageStr = message.toString().trim();
  console.log(`Received message from ${receivedTopic}: ${messageStr}`);

  if (messageStr.includes('HB')) {
    console.log('Heartbeat received.');
    setMachineStatus(true);
    await sendStockMessage();
    resetHeartbeatTimer();
    return;
  }

  if (messageStr.includes('SR')) {
    console.log('Stock request received.');
    await sendStockMessage();
    return;
  }

  console.log('Unrecognized message type.');
});

// HTTP route to verify the app is running
app.get('/', (req, res) => {
  res.send('MQTT stock listener is running.');
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
