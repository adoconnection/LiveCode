using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LiveCode.Hubs
{
    public class SessionHub : Hub
    {
        private static ConcurrentDictionary<Guid, IList<string>> Sessions = new ConcurrentDictionary<Guid, IList<string>>();
        private static ConcurrentDictionary<string, Guid> MembershipIndex = new ConcurrentDictionary<string, Guid>();
        private static ConcurrentDictionary<Guid, string> SessionContent = new ConcurrentDictionary<Guid, string>();

        public async Task Join(Guid sessionId)
        {
            IList<string> connections = Sessions.GetOrAdd(sessionId, new List<string>());

            connections.Add(Context.ConnectionId);
            MembershipIndex.TryAdd(Context.ConnectionId, sessionId);

            await Clients.Client(Context.ConnectionId).SendAsync("ReceiveContent", SessionContent.GetOrAdd(sessionId, ""), 0, 0);

            foreach (string connection in Sessions[sessionId])
            {
                if (connection == Context.ConnectionId)
                {
                    continue;
                }

                await Clients.Client(connection).SendAsync("Connected", Context.ConnectionId);
            }
        }

        public override Task OnDisconnectedAsync(Exception exception)
        {
            if (!MembershipIndex.TryGetValue(Context.ConnectionId, out Guid session))
            {
                return base.OnDisconnectedAsync(exception);
            }

            foreach (string connection in Sessions[session])
            {
                if (connection == Context.ConnectionId)
                {
                    continue;
                }

                Clients.Client(connection).SendAsync("Disconnected", Context.ConnectionId);
            }

            return base.OnDisconnectedAsync(exception);
        }

        public async Task UpdateContent(string content, int row, int pos)
        {
            if (!MembershipIndex.TryGetValue(Context.ConnectionId, out Guid session))
            {
                return;
            }

            SessionContent.AddOrUpdate(session, content, (a,b) => content);

            foreach (string connection in Sessions[session])
            {
                if (connection == Context.ConnectionId)
                {
                    continue;
                }

                await Clients.Client(connection).SendAsync("ReceiveContent", content, row, pos);
            }
        }

        public async Task UpdateCursor(int row, int pos)
        {
            if (!MembershipIndex.TryGetValue(Context.ConnectionId, out Guid session))
            {
                return;
            }

            foreach (string connection in Sessions[session])
            {
                if (connection == Context.ConnectionId)
                {
                    continue;
                }

                await Clients.Client(connection).SendAsync("ReceiveCursor", row, pos);
            }
        }

        public async Task UpdatePointer(int x, int y)
        {
            if (!MembershipIndex.TryGetValue(Context.ConnectionId, out Guid session))
            {
                return;
            }

            foreach (string connection in Sessions[session])
            {
                if (connection == Context.ConnectionId)
                {
                    continue;
                }

                await Clients.Client(connection).SendAsync("ReceivePointer", Context.ConnectionId, x, y);
            }
        }

        public async Task UpdateSelection(int srow, int spos, int erow, int epos)
        {
            if (!MembershipIndex.TryGetValue(Context.ConnectionId, out Guid session))
            {
                return;
            }

            foreach (string connection in Sessions[session])
            {
                if (connection == Context.ConnectionId)
                {
                    continue;
                }

                await Clients.Client(connection).SendAsync("ReceiveSelection", srow, spos, erow, epos);
            }
        }
    }
}
