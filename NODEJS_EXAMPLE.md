# Contoh Node.js + MySQL Backend

Ini adalah contoh implementasi backend Node.js + MySQL untuk sistem MA Al-Ittifaqiah 2.

## Setup Project

```bash
mkdir ma-alittifaqiah2-backend
cd ma-alittifaqiah2-backend
npm init -y
```

## Install Dependencies

```bash
npm install express mysql2 bcryptjs jsonwebtoken cors dotenv express-validator qrcode node-cron uuid
npm install --save-dev nodemon
```

## Structure Project

```
ma-alittifaqiah2-backend/
├── src/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── absensiController.js
│   │   ├── pengumumanController.js
│   │   └── ... (controllers lainnya)
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── absensi.js
│   │   └── ... (routes lainnya)
│   ├── cron/
│   │   └── attendance.js
│   └── server.js
├── .env
├── .gitignore
└── package.json
```

## File: .env

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ma_alittifaqiah2
JWT_SECRET=your_super_secret_jwt_key_here
```

## File: src/config/database.js

```javascript
const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const promisePool = pool.promise();

module.exports = promisePool;
```

## File: src/middleware/auth.js

```javascript
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: true,
        message: 'Token tidak ditemukan'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({
      error: true,
      message: 'Token tidak valid'
    });
  }
};

module.exports = authMiddleware;
```

## File: src/controllers/authController.js

```javascript
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Cari user berdasarkan email
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        error: true,
        message: 'Email atau password salah'
      });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        error: true,
        message: 'Email atau password salah'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      error: false,
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Terjadi kesalahan server'
    });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, nip, name, email, phone, subject, role FROM users WHERE id = ?',
      [req.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'User tidak ditemukan'
      });
    }

    res.json({
      error: false,
      data: users[0]
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Terjadi kesalahan server'
    });
  }
};
```

## File: src/controllers/absensiController.js

```javascript
const db = require('../config/database');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

exports.getToday = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const [attendances] = await db.query(`
      SELECT a.*, u.name as user_name
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE a.date = ?
      ORDER BY a.check_in ASC
    `, [today]);

    res.json({
      error: false,
      data: attendances
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Terjadi kesalahan server'
    });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    
    let query = 'SELECT * FROM attendance WHERE 1=1';
    const params = [];

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    } else {
      query += ' AND user_id = ?';
      params.push(req.userId);
    }

    query += ' ORDER BY date DESC';

    const [attendances] = await db.query(query, params);

    res.json({
      error: false,
      data: attendances
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Terjadi kesalahan server'
    });
  }
};

exports.checkInQR = async (req, res) => {
  try {
    const { qrCode } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().split(' ')[0];

    // Verify QR code (decode userId dari QR)
    // Format QR: "USER_ID:TIMESTAMP"
    const [userId] = qrCode.split(':');

    // Cek apakah sudah absen hari ini
    const [existing] = await db.query(
      'SELECT * FROM attendance WHERE user_id = ? AND date = ?',
      [userId, today]
    );

    if (existing.length > 0) {
      // Update check_out jika sudah ada
      await db.query(
        'UPDATE attendance SET check_out = ? WHERE id = ?',
        [now, existing[0].id]
      );

      return res.json({
        error: false,
        message: 'Check-out berhasil dicatat',
        attendance: existing[0]
      });
    }

    // Buat absensi baru
    const id = uuidv4();
    const status = now > '07:30:00' ? 'terlambat' : 'hadir';

    await db.query(
      'INSERT INTO attendance (id, user_id, date, check_in, status, type) VALUES (?, ?, ?, ?, ?, ?)',
      [id, userId, today, now, status, 'manual']
    );

    res.json({
      error: false,
      message: 'Absensi berhasil dicatat',
      attendance: { id, check_in: now, status }
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Terjadi kesalahan server'
    });
  }
};

exports.generateQR = async (req, res) => {
  try {
    const { userId } = req.params;
    const timestamp = Date.now();
    const qrData = `${userId}:${timestamp}`;

    const qrImage = await QRCode.toDataURL(qrData);

    res.json({
      error: false,
      qrImage
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Gagal generate QR code'
    });
  }
};

exports.getAutoStatus = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Cek apakah hari ini libur
    const [holidays] = await db.query(
      'SELECT * FROM holidays WHERE date = ?',
      [today]
    );

    if (holidays.length > 0) {
      return res.json({
        error: false,
        data: {
          isActive: false,
          reason: `Hari ini adalah hari libur: ${holidays[0].name}`
        }
      });
    }

    res.json({
      error: false,
      data: {
        isActive: true,
        reason: null
      }
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Terjadi kesalahan server'
    });
  }
};
```

## File: src/cron/attendance.js

```javascript
const cron = require('node-cron');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Jalankan setiap hari jam 07:00
const startAutoAttendance = () => {
  cron.schedule('0 7 * * *', async () => {
    console.log('Running auto attendance cron...');
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Cek apakah hari ini libur
      const [holidays] = await db.query(
        'SELECT * FROM holidays WHERE date = ?',
        [today]
      );

      if (holidays.length > 0) {
        console.log(`Skipping auto attendance: Holiday - ${holidays[0].name}`);
        return;
      }

      // Get semua guru/staf
      const [users] = await db.query(
        'SELECT id FROM users WHERE role IN ("teacher", "staff")'
      );

      // Buat record absensi otomatis untuk semua guru
      for (const user of users) {
        const id = uuidv4();
        await db.query(
          'INSERT INTO attendance (id, user_id, date, status, type) VALUES (?, ?, ?, ?, ?)',
          [id, user.id, today, 'alpha', 'auto']
        );
      }

      console.log(`Auto attendance created for ${users.length} users`);
    } catch (error) {
      console.error('Error in auto attendance cron:', error);
    }
  });

  console.log('Auto attendance cron scheduled');
};

module.exports = startAutoAttendance;
```

## File: src/routes/auth.js

```javascript
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getCurrentUser);

module.exports = router;
```

## File: src/routes/absensi.js

```javascript
const express = require('express');
const router = express.Router();
const absensiController = require('../controllers/absensiController');
const authMiddleware = require('../middleware/auth');

router.get('/today', authMiddleware, absensiController.getToday);
router.get('/history', authMiddleware, absensiController.getHistory);
router.post('/checkin-qr', authMiddleware, absensiController.checkInQR);
router.get('/generate-qr/:userId', authMiddleware, absensiController.generateQR);
router.get('/auto-status', authMiddleware, absensiController.getAutoStatus);

module.exports = router;
```

## File: src/server.js

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const absensiRoutes = require('./routes/absensi');
// Import routes lainnya...

const startAutoAttendance = require('./cron/attendance');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/absensi', absensiRoutes);
// Tambahkan routes lainnya...

// Start cron jobs
startAutoAttendance();

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## File: package.json (update scripts)

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  }
}
```

## Database Seeder (opsional)

Buat file `seed.js` untuk insert data awal:

```javascript
const bcrypt = require('bcryptjs');
const db = require('./src/config/database');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  try {
    // Insert admin user
    const adminId = uuidv4();
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await db.query(
      `INSERT INTO users (id, nip, name, email, password, role) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [adminId, '1234567890', 'Admin', 'admin@ma-alittifaqiah2.sch.id', hashedPassword, 'admin']
    );

    console.log('Seeding completed!');
    console.log('Admin credentials:');
    console.log('Email: admin@ma-alittifaqiah2.sch.id');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seed();
```

## Menjalankan Backend

```bash
# Development
npm run dev

# Production
npm start

# Seed database (opsional)
node seed.js
```

## Testing dengan cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ma-alittifaqiah2.sch.id","password":"admin123"}'

# Get current user
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Catatan

1. Sesuaikan nama file dan struktur dengan kebutuhan Anda
2. Implementasi controller lainnya mengikuti pola yang sama
3. Jangan lupa setup database MySQL dan jalankan migration schema
4. Untuk production, tambahkan validasi input yang lebih ketat
5. Tambahkan rate limiting untuk keamanan
6. Setup HTTPS untuk production

## Environment Variables untuk Frontend

Di Lovable, buat file `.env.local` (manual):

```env
VITE_API_URL=http://localhost:3000/api
```

Atau update di file `src/lib/api.ts` langsung dengan URL API Anda.
