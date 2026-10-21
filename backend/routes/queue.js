const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();

// SSE clients pool
const sseClients = new Map();

// GET /api/queue/active - Get active queue for specific poli
router.get('/active', async (req, res) => {
  try {
    const { poli } = req.query;
    
    const queues = await prisma.queueLog.findMany({
      where: {
        polyclinic: poli || undefined,
        status: { in: ['waiting', 'called', 'serving'] }
      },
      orderBy: { createdAt: 'asc' },
      include: {
        // We'll manually join with Pendaftaran via pendaftaranId
      }
    });

    // Manually fetch related Pendaftaran data
    const enrichedQueues = await Promise.all(
      queues.map(async (q) => {
        const pendaftaran = await prisma.pendaftaran.findUnique({
          where: { id: q.pendaftaranId }
        });
        return { ...q, pendaftaran };
      })
    );

    res.json({ success: true, queues: enrichedQueues });
  } catch (error) {
    console.error('[QUEUE] Error fetching active:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/queue/call - Call next patient
router.post('/call', async (req, res) => {
  try {
    const { queueId, loketNumber, calledBy } = req.body;

    const updated = await prisma.queueLog.update({
      where: { id: queueId },
      data: {
        status: 'called',
        calledAt: new Date(),
        calledBy: calledBy || 'admin',
        loketNumber: loketNumber || 'Loket 1'
      }
    });

    // Broadcast to SSE clients
    broadcastQueueUpdate(updated.polyclinic);

    res.json({ success: true, queue: updated });
  } catch (error) {
    console.error('[QUEUE] Error calling patient:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/queue/complete/:id - Mark completed
router.post('/complete/:id', async (req, res) => {
  try {
    const updated = await prisma.queueLog.update({
      where: { id: req.params.id },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    });

    broadcastQueueUpdate(updated.polyclinic);

    res.json({ success: true, queue: updated });
  } catch (error) {
    console.error('[QUEUE] Error completing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/queue/skip/:id - Skip/hold patient
router.post('/skip/:id', async (req, res) => {
  try {
    const updated = await prisma.queueLog.update({
      where: { id: req.params.id },
      data: { status: 'skipped' }
    });

    broadcastQueueUpdate(updated.polyclinic);

    res.json({ success: true, queue: updated });
  } catch (error) {
    console.error('[QUEUE] Error skipping:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/queue/display - SSE stream for TV display
router.get('/display', async (req, res) => {
  const { poli } = req.query;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const clientId = Date.now() + Math.random();
  sseClients.set(clientId, { res, poli });

  // Send initial data
  const queues = await prisma.queueLog.findMany({
    where: {
      polyclinic: poli || undefined,
      status: { in: ['waiting', 'called', 'serving'] }
    },
    orderBy: { createdAt: 'asc' }
  });

  res.write(`data: ${JSON.stringify({ type: 'init', queues })}\n\n`);

  // Cleanup on disconnect
  req.on('close', () => {
    sseClients.delete(clientId);
  });
});

// GET /api/queue/logs - History/report
router.get('/logs', async (req, res) => {
  try {
    const { date, poli } = req.query;
    
    const where = {};
    if (poli) where.polyclinic = poli;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      where.createdAt = { gte: startDate, lt: endDate };
    }

    const logs = await prisma.queueLog.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, logs });
  } catch (error) {
    console.error('[QUEUE] Error fetching logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper: broadcast update to SSE clients
function broadcastQueueUpdate(poli) {
  sseClients.forEach(async (client) => {
    if (!client.poli || client.poli === poli) {
      const queues = await prisma.queueLog.findMany({
        where: {
          polyclinic: poli,
          status: { in: ['waiting', 'called', 'serving'] }
        },
        orderBy: { createdAt: 'asc' }
      });
      client.res.write(`data: ${JSON.stringify({ type: 'update', queues })}\n\n`);
    }
  });
}

module.exports = router;
