import type { NextApiRequest, NextApiResponse } from 'next'
 
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Process a GET request
    res.status(200).json({ status: 'ok' });
  } else {
    // Not supported method
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}