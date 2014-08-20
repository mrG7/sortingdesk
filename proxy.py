'''
This is a special web proxy designed for testing *client only* web
applications that require AJAX requests on a different domain. This
effectively bypasses the "same origin policy" for XMLHttpRequest.

It is easy to use. Simply navigate to the root directory of your
client application and run `python path/to/this/proxy.py`. Your
client application should now be available in your browser at
http://localhost:8080 (assuming the CWD has an `index.html` file).

To subvert the same origin policy, simply prepend
`http://localhost:8080/proxy/` to any URL. That's it.
'''
from __future__ import absolute_import, division, print_function

import argparse
from SimpleHTTPServer import SimpleHTTPRequestHandler as SimpleReq
import SocketServer
import urllib2


PROXY_PREFIX = '/proxy/'


def proxy(f):
    '''
    proxy is a higher-order function that wraps any `do_METHOD`
    in a `BaseHTTPServer`. It injects the `/proxy/{any URL}` route
    for that method.

    If the route does not start with `/proxy/`, then `f` is called.

    If `f` is `None`, then a `404` error is sent.
    '''
    def _(self):
        if self.path.startswith(PROXY_PREFIX):
            fullurl = self.path[len(PROXY_PREFIX):]
            host = fullurl[len('http://'):]
            if '/' in host:
                host = host[:host.index('/')]
            if ':' in host:
                host, port = host.split(':')
                port = int(port)
            else:
                port = 80

            data = None
            try:
                clen = int(self.headers.getheader('content-length'))
                data = self.rfile.read(clen)
            except TypeError:
                pass
            req = urllib2.Request(fullurl, data=data)
            req.get_method = lambda: self.command
            for k in self.headers:
                v = self.headers.getheader(k)
                if k.lower() == 'host':
                    v = '%s:%d' % (host, port)
                req.add_header(k, v)
            try:
                self.copyfile(urllib2.urlopen(req), self.wfile)
            except urllib2.HTTPError as e:
                print(e.code, str(e.reason))
                self.send_error(e.code, str(e.reason))
        elif f is None:
            self.send_error(404, "Not found")
        else:
            return f(self)
    return _


class SimpleProxy (SimpleReq):
    '''
    This is a combination of Python's classic SimpleHTTPServer and a
    basic proxy accessible for any standard HTTP method at `/proxy/`.
    '''
    # GET is special because if there's no /proxy/, then it falls back
    # to serving local files.
    do_GET = proxy(SimpleReq.do_GET)

    # The rest can just send 404 if there's no /proxy/.
    others = ['OPTIONS', 'HEAD', 'POST', 'PUT', 'DELETE', 'TRACE', 'CONNECT']
    for meth in others:
        locals()['do_%s' % meth] = proxy(None)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('host', nargs='?', default='localhost')
    p.add_argument('port', nargs='?', type=int, default=8080)
    args = p.parse_args()

    serv = SocketServer.ThreadingTCPServer((args.host, args.port), SimpleProxy)
    print('serving at %s:%d' % (args.host, args.port))
    serv.serve_forever()
