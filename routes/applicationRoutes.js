const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const verifyToken = require('../middleware/authMiddleware');

const COLLECTION = 'applications';
const VALID_STATUSES = ['Applied', 'Online Test', 'Interview', 'Offer', 'Rejected'];

// Sabhi routes ko authentication se protect karo
router.use(verifyToken);

// 1. READ: Logged-in user ki saari applications fetch karo
router.get('/', async (req, res) => {
  try {
    const snapshot = await db
      .collection(COLLECTION)
      .where('userId', '==', req.user.uid)
      .get();

    const applications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Latest created entries sabse upar (JS mein sort karne se Firestore index error nahi aata)
    applications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json(applications);
  } catch (error) {
    console.error('GET /api/applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// 2. CREATE: Nayi internship/job application add karo
router.post('/', async (req, res) => {
  try {
    const { company, role, status, stipend, location, deadline, link, notes } = req.body;

    if (!company || !company.trim() || !role || !role.trim()) {
      return res.status(400).json({ error: 'Company name aur Role required hain' });
    }

    const cleanStatus = VALID_STATUSES.includes(status) ? status : 'Applied';
    const now = new Date().toISOString();

    const newApplication = {
      userId: req.user.uid,
      company: company.trim(),
      role: role.trim(),
      status: cleanStatus,
      stipend: stipend ? Number(stipend) : 0,
      location: location ? location.trim() : 'Remote',
      deadline: deadline || '',
      link: link ? link.trim() : '',
      notes: notes ? notes.trim() : '',
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection(COLLECTION).add(newApplication);

    res.status(201).json({
      id: docRef.id,
      ...newApplication,
    });
  } catch (error) {
    console.error('POST /api/applications error:', error);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// 3. UPDATE: Existing application update karo
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection(COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (doc.data().userId !== req.user.uid) {
      return res.status(403).json({ error: 'Forbidden: Access denied' });
    }

    const { company, role, status, stipend, location, deadline, link, notes } = req.body;
    const updates = { updatedAt: new Date().toISOString() };

    if (company !== undefined && company.trim()) updates.company = company.trim();
    if (role !== undefined && role.trim()) updates.role = role.trim();
    if (status !== undefined && VALID_STATUSES.includes(status)) updates.status = status;
    if (stipend !== undefined) updates.stipend = Number(stipend) || 0;
    if (location !== undefined) updates.location = location.trim();
    if (deadline !== undefined) updates.deadline = deadline;
    if (link !== undefined) updates.link = link.trim();
    if (notes !== undefined) updates.notes = notes.trim();

    await docRef.update(updates);

    const updatedDoc = await docRef.get();
    res.status(200).json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
    });
  } catch (error) {
    console.error('PUT /api/applications/:id error:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// 4. DELETE: Application delete karo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection(COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (doc.data().userId !== req.user.uid) {
      return res.status(403).json({ error: 'Forbidden: Access denied' });
    }

    await docRef.delete();
    res.status(200).json({ message: 'Application deleted successfully', id });
  } catch (error) {
    console.error('DELETE /api/applications/:id error:', error);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

module.exports = router;