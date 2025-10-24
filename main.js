const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 5000;
const DATA_FILE = "./data.json";

app.use(cors());
app.use(bodyParser.json());

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// -------------------- STUDENT -------------------- //
app.post("/api/request-pass", (req, res) => {
  const { studentName, studentId, reason, expectedTime, duration } = req.body;
  const data = readData();

  const newRequest = {
    id: uuidv4(),
    studentName,
    studentId,
    reason,
    expectedTime,
    duration,
    status: "Pending",
    remarks: "",
    qrCode: "",
    entryTime: null,
    exitTime: null
  };

  data.requests.push(newRequest);
  writeData(data);
  res.json({ message: "Request sent successfully", request: newRequest });
});

// -------------------- MODERATOR -------------------- //
app.get("/api/requests", (req, res) => {
  const data = readData();
  res.json(data.requests);
});

app.post("/api/requests/:id/approve", (req, res) => {
  const { id } = req.params;
  const { remarks } = req.body;
  const data = readData();
  const request = data.requests.find(r => r.id === id);
  if (!request) return res.status(404).json({ message: "Request not found" });

  request.status = "Approved";
  request.remarks = remarks || "";
  request.qrCode = uuidv4();
  writeData(data);
  res.json({ message: "Approved", request });
});

app.post("/api/requests/:id/reject", (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const data = readData();
  const request = data.requests.find(r => r.id === id);
  if (!request) return res.status(404).json({ message: "Request not found" });

  request.status = "Rejected";
  request.remarks = reason;
  writeData(data);
  res.json({ message: "Rejected", request });
});

// -------------------- GATEKEEPER -------------------- //
app.post("/api/scan", (req, res) => {
  const { qrCode, type } = req.body; // type: 'entry' or 'exit'
  const data = readData();
  const request = data.requests.find(r => r.qrCode === qrCode);

  if (!request) return res.status(404).json({ message: "Invalid QR" });

  if (type === "entry") request.entryTime = new Date();
  if (type === "exit") request.exitTime = new Date();

  writeData(data);
  res.json({ message: "Scan recorded", request });
});

// -------------------- ADMIN -------------------- //
app.get("/api/admin/logs", (req, res) => {
  const data = readData();
  res.json(data.requests);
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
