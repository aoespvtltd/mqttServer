// const express = require('express');
// const mqtt = require('mqtt');

import express from 'express';
import mqtt from 'mqtt';
import axios from 'axios';

const app = express();
const PORT = 3000;

// MQTT client setup
const mqttBrokerUrl = 'mqtt://mqtt.eclipseprojects.io'; // Change to your broker
let mqttTopics = []; // Will be populated from API
let getAllTopics = [];

// Map to store heartbeat timers for each device
const deviceHeartbeats = new Map();

const mqttClient = mqtt.connect(mqttBrokerUrl);

const sendStockMessage = async (topic) => {
    try {
        // Extract device identifier from topic (remove /server suffix)
        const deviceIdentifier = topic.replace('/server', '');
        
        // Find the padEase device in getAllTopics
        const padEaseDevice = getAllTopics.find(device => 
            device.type === 'padEase' && 
            (device.name === deviceIdentifier || device._id === deviceIdentifier)
        );

        if (!padEaseDevice) {
            console.error(`No padEase device found for identifier: ${deviceIdentifier}`);
            return;
        }

        const response = await axios.get(`https://vendingao-api.xyz/api/v1/pad/active/${padEaseDevice._id}`);
        console.log("object") 
        // Update device status to inactive
        await axios.patch(`https://vendingao-api.xyz/api/v1/padEase/name/${padEaseDevice.name}`, {
            status: true
        });
        const pads = response.data?.data || [];
    
        const stockMessage = `*padEase,${deviceIdentifier},` +
            pads.map(pad => `S${pad.padNumber}:${pad.stock}`).join(',') + 'y#';
    
        console.log(`Formatted stock message: ${stockMessage}`, `${deviceIdentifier}/device`, stockMessage);
        mqttClient.publish(`${deviceIdentifier}/device`, stockMessage);
    } catch (error) {
        console.error('Error fetching pad stock:', error.message);
    }
};

// Function to handle device heartbeat
const handleDeviceHeartbeat = (deviceId) => {
    // Clear existing timeout if any
    if (deviceHeartbeats.has(deviceId)) {
        clearTimeout(deviceHeartbeats.get(deviceId));
    }

    // Set new timeout
    const timeout = setTimeout(async () => {
        try {
            // Update device status to inactive
            await axios.patch(`https://vendingao-api.xyz/api/v1/padEase/name/${deviceId}`, {
                status: false
            });
            console.log(`Device ${deviceId} marked as inactive due to no heartbeat`);
            deviceHeartbeats.delete(deviceId);
        } catch (error) {
            console.error(`Error updating status for device ${deviceId}:`, error.message);
        }
    }, 5 * 60 * 1000); // 5 minutes

    deviceHeartbeats.set(deviceId, timeout);
};

// Function to fetch topics from API
async function fetchTopicsFromAPI() {
    try {
        const response = await axios.get('https://vendingao-api.xyz/api/v1/vending-machines/getOverall');
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
            getAllTopics = response.data.data;
            // Filter padEase devices and format their topics
            mqttTopics = response.data.data
                // .filter(device => device.type === 'padEase')
                .map(device => `${device.name || device._id}/server`);
            
            console.log('Fetched topics from API:', mqttTopics);
            
            // Subscribe to the fetched topics
            if (mqttClient.connected) {
                mqttClient.subscribe(mqttTopics, (err) => {
                    if (err) {
                        console.error('Subscription error:', err);
                    } else {
                        console.log(`Subscribed to topics: ${mqttTopics.join(', ')}`);
                    }
                });
            }
        } else {
            console.error('Invalid response format from API');
        }
    } catch (error) {
        console.error('Error fetching topics from API:', error.message);
    }
}

// When connected, fetch topics and subscribe
mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
    fetchTopicsFromAPI();
});

// Handle incoming messages
mqttClient.on('message', (topic, message) => {
    const messageStr = message.toString();
    console.log(`Received message on topic "${topic}": ${messageStr}`);

    // Check if this is a padEase topic and contains heartbeat
    if (topic.endsWith('/server') && messageStr.includes('HB')) {
        // Extract device name from topic (remove /server suffix)
        const deviceName = topic.replace('/server', '');
        
        // Update device status to active
        axios.patch(`https://vendingao-api.xyz/api/v1/padEase/name/${deviceName}`, {
            status: true
        }).catch(error => {
            console.error(`Error updating status for device ${deviceName}:`, error.message);
        });

        // Handle heartbeat
        handleDeviceHeartbeat(deviceName);
    }
    
    // Handle stock request messages
    if (topic.startsWith('J') && messageStr.includes('SR')) {
        const deviceTopic = `${topic}/device`;
        sendStockMessage(topic);
    }
});

// Express endpoint for health check
app.get('/', (req, res) => {
    res.send('MQTT Subscriber is running.');
});

// Start Express server
app.listen(PORT, () => {
    console.log(`Express server listening at http://localhost:${PORT}`);
});
