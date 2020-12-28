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
