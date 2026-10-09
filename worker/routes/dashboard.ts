import { Hono } from 'hono';
import { AppContext } from '../types.ts';
import { authMiddleware } from '../auth.ts';
import { store } from '../store.ts';

export const dashboardRouter = new Hono<AppContext>();

dashboardRouter.use('*', authMiddleware);

dashboardRouter.get('/stats', async (c) => {
  const user = c.get('user')!;
  const stats = store.getDashboardStats(user.guru_id);

  return c.json({
    success: true,
    data: {
      ...stats,
      currentUser: {
        id: user.id,
        username: user.username,
        nama_lengkap: user.nama_lengkap,
        role: user.role,
        staf_role: user.staf_role,
      },
    },
    message: 'Data statistik dashboard berhasil dimuat.',
  });
});
