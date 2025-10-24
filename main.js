const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ---------------- Helpers ----------------
const readDB = () => JSON.parse(fs.readFileSync('database.json','utf-8'));
const writeDB = (db) => fs.writeFileSync('database.json', JSON.stringify(db,null,2));

const generateQR = (id) => `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${id}`;

// ---------------- Student ----------------
// Submit a new request
app.post('/api/request-pass', (req,res)=>{
    const {name,id,reason,expectedTime,duration} = req.body;
    let db = readDB();

    const exists = db.requests.find(r => r.id===id && r.status==="pending");
    if(exists) return res.json({message:"You already have a pending request."});

    const newRequest = {
        id, name, reason, expectedTime, duration,
        status: "pending", qr: null, rejectionReason: null,
        entryTime: null, exitTime: null
    };

    db.requests.push(newRequest);
    writeDB(db);
    res.json({message:"Request submitted successfully"});
});

// Get student request status + QR
app.get('/api/student/status/:id', (req,res)=>{
    const studentId = req.params.id;
    let db = readDB();
    const request = db.requests.find(r => r.id===studentId);

    if(!request) return res.json({status:"no_request"});
    res.json({
        status: request.status,
        qr: request.qr,
        reason: request.rejectionReason
    });
});

// ---------------- Moderator ----------------
// Get all requests (pending + history)
app.get('/api/moderator/requests', (req,res)=>{
    let db = readDB();
    res.json(db.requests);
});

// Approve request
app.post('/api/moderator/approve/:id', (req,res)=>{
    let db = readDB();
    const request = db.requests.find(r => r.id===req.params.id);
    if(!request) return res.status(404).json({error:"Request not found"});

    request.status = "approved";
    request.qr = generateQR(request.id);

    writeDB(db);
    res.json({message:"Request approved"});
});

// Reject request
app.post('/api/moderator/reject/:id', (req,res)=>{
    const {reason} = req.body;
    let db = readDB();
    const request = db.requests.find(r => r.id===req.params.id);
    if(!request) return res.status(404).json({error:"Request not found"});

    request.status = "rejected";
    request.rejectionReason = reason;

    writeDB(db);
    res.json({message:"Request rejected"});
});

// ---------------- Gatekeeper ----------------
// Scan QR for entry/exit
app.post('/api/gate/scan', (req,res)=>{
    const {qrId, type} = req.body; // type = "entry" or "exit"
    let db = readDB();
    const request = db.requests.find(r => r.id===qrId);

    if(!request || request.status!=="approved") return res.status(404).json({error:"Invalid QR"});

    const now = new Date().toISOString();
    if(type==="entry") request.entryTime = now;
    if(type==="exit") request.exitTime = now;

    writeDB(db);
    res.json({message:`${type} recorded`});
});

// ---------------- Admin ----------------
// View all logs
app.get('/api/admin/logs', (req,res)=>{
    let db = readDB();
    res.json(db.requests);
});

// ---------------- Start Server ----------------
app.listen(PORT, ()=>{
    console.log(`Server running on port ${PORT}`);
});
