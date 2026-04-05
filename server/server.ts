import { Server, Origins } from 'boardgame.io/server';
import { Game } from '@candyfight/shared/Game';
import KoaCors from '@koa/cors';
import type { StorageAPI } from 'boardgame.io';

const allowed = new Set([
  '*',
  'https://dyp.lucho.io',
]);

const server = Server({
  games: [Game],
  origins: [
    Origins.LOCALHOST,
    'https://dyp.lucho.io',
    '*'
  ],
});

server.app.use(
  KoaCors({
    origin: (ctx) => {
      const origin = ctx.request.headers.origin ?? '*';
      return allowed.has(origin) ? origin : '*';
    },
    credentials: true,
    allowMethods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'],
    exposeHeaders: ['Content-Length'],
  })
);

// server.app.use(async (ctx, next) => {
//     const matchID  = ctx.query.matchID  ?? ctx.query.matchId  ?? ctx.query.matchid;
//     const playerID = ctx.query.playerID ?? ctx.query.playerId ?? ctx.query.playerid;

//     console.log(ctx)

//     console.log('[SOCKET HANDSHAKE]',
//       'method:', ctx.method,
//       'url:', ctx.url,
//       'matchID:', matchID,
//       'playerID:', playerID
//     );
//   // }
//   await next();
// });

server.app.use(async (ctx, next) => {
  if (ctx.path === '/health') {
    ctx.status = 200;
    ctx.body = { status: 'ok' };
    return;
  }
  await next();
});

server.router.delete('/admin/matches/:matchID', async (ctx) => {
  const { matchID } = ctx.params;

  const data = await (server.db as StorageAPI.Async).fetch(matchID, { metadata: true });
  if (!data.metadata) {
    ctx.status = 404;
    ctx.body = { error: 'Match not found' };
    return;
  }

  await (server.db as StorageAPI.Async).wipe(matchID);

  ctx.status = 204;
});

const port = Number(process.env.PORT ?? 4000);
server.run({ port });