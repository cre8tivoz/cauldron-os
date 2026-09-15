const dns = require('dns').promises;
const http = require('http');
const https = require('https');
const net = require('net');

const METADATA_HOSTS = new Set([
  'metadata.google.internal',
  'metadata.goog',
  'kubernetes.default.svc',
]);

function ipv4ToInt(ip) {
  return ip.split('.').reduce((acc, octet) => ((acc << 8) + Number(octet)) >>> 0, 0);
}

function unwrapMappedIpv4(ip) {
  const value = String(ip || '').toLowerCase();
  if (!value.startsWith('::ffff:')) return value;
  const rest = value.slice(7);
  if (net.isIP(rest) === 4) return rest;
  // Node may canonicalize to hex form (::ffff:a9fe:a9fe). Convert to dotted-quad.
  const match = rest.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (!match) return value;
  const hi = parseInt(match[1], 16);
  const lo = parseInt(match[2], 16);
  return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
}

function isIpv6LinkLocal(ip) {
  const value = String(ip || '').toLowerCase();
  if (!value || value === '::') return false;
  // fe80::/10 — first hextet in [0xfe80, 0xfebf], including compressed forms.
  const firstToken = value.startsWith('::') ? '0' : value.split(':', 1)[0];
  const firstHextet = parseInt(firstToken, 16);
  if (Number.isNaN(firstHextet)) return false;
  return (firstHextet & 0xffc0) === 0xfe80;
}

function isLoopbackIp(ip) {
  const value = unwrapMappedIpv4(ip);
  const version = net.isIP(value);
  if (version === 4) {
    const n = ipv4ToInt(value);
    return n >= 0x7f000000 && n <= 0x7fffffff;
  }
  if (version === 6) return value === '::1';
  return false;
}

function isLinkLocalOrMetadataIp(ip) {
  const value = unwrapMappedIpv4(ip);
  const version = net.isIP(value);
  if (version === 4) {
    const n = ipv4ToInt(value);
    return n >= 0xa9fe0000 && n <= 0xa9feffff;
  }
  if (version === 6) return value === '::' || isIpv6LinkLocal(value);
  return false;
}

function isPrivateOrReservedIp(ip) {
  const value = unwrapMappedIpv4(ip);
  if (isLoopbackIp(value) || isLinkLocalOrMetadataIp(value)) return true;
  const version = net.isIP(value);
  if (version === 4) {
    const n = ipv4ToInt(value);
    if (n <= 0x00ffffff) return true; // 0.0.0.0/8
    if (n >= 0x0a000000 && n <= 0x0affffff) return true; // 10.0.0.0/8
    if (n >= 0x64400000 && n <= 0x647fffff) return true; // 100.64.0.0/10
    if (n >= 0xac100000 && n <= 0xac1fffff) return true; // 172.16.0.0/12
    if (n >= 0xc0000000 && n <= 0xc00000ff) return true; // 192.0.0.0/24
    if (n >= 0xc0a80000 && n <= 0xc0a8ffff) return true; // 192.168.0.0/16
    if (n >= 0xe0000000) return true; // multicast / reserved
    return false;
  }
  if (version === 6) {
    if (value.startsWith('fc') || value.startsWith('fd')) return true;
    if (value.startsWith('ff')) return true;
    return false;
  }
  return true;
}

function normalizeHostname(hostname) {
  const host = String(hostname || '')
    .toLowerCase()
    .replace(/\.$/, '');
  if (host.startsWith('[') && host.endsWith(']')) return host.slice(1, -1);
  return host;
}

function isLoopbackHostname(hostname) {
  const host = normalizeHostname(hostname);
  return host === 'localhost' || host.endsWith('.localhost') || isLoopbackIp(host);
}

function isExactMetadataHostname(hostname) {
  return METADATA_HOSTS.has(normalizeHostname(hostname));
}

function isMetadataHostname(hostname) {
  const host = normalizeHostname(hostname);
  // Research treats the whole .internal TLD as metadata-adjacent. Model base
  // URLs intentionally allow private *.internal LAN gateways and only block
  // the known cloud-metadata hostnames below via isExactMetadataHostname.
  return isExactMetadataHostname(host) || host.endsWith('.internal');
}

function createPinnedLookup(address, family) {
  const ipFamily = Number(family) === 6 ? 6 : 4;
  const record = { address, family: ipFamily };
  return (hostname, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    if (options && options.all) {
      callback(null, [record]);
      return;
    }
    callback(null, record.address, record.family);
  };
}

function validateHttpUrl(targetUrl) {
  let parsed;
  try {
    parsed = new URL(String(targetUrl || ''));
  } catch {
    throw new Error('Invalid URL');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http/https URLs are supported');
  }
  if (parsed.username || parsed.password) {
    throw new Error('Research URLs must not include credentials');
  }
  return parsed;
}

function resolveRedirectUrl(currentUrl, location) {
  if (!location) throw new Error('Invalid redirect');
  return new URL(location, currentUrl).toString();
}

async function assertSafeResearchUrl(targetUrl, options = {}) {
  const parsed = validateHttpUrl(targetUrl);
  const hostname = normalizeHostname(parsed.hostname);
  const allowPrivate = Boolean(
    options.allowPrivate || process.env.CAULDRON_ALLOW_PRIVATE_RESEARCH === '1'
  );

  if (isMetadataHostname(hostname)) {
    throw new Error('Research URL host is not allowed');
  }

  const resolved = net.isIP(hostname)
    ? [{ address: hostname, family: net.isIP(hostname) }]
    : await dns.lookup(hostname, { all: true });

  if (!resolved.length) {
    throw new Error('Research URL host could not be resolved');
  }

  const hostnameIsLoopback = Boolean(net.isIP(hostname))
    ? isLoopbackIp(hostname)
    : isLoopbackHostname(hostname);

  for (const entry of resolved) {
    const address = entry.address;
    if (isLinkLocalOrMetadataIp(address)) {
      throw new Error('Research URL host is not allowed');
    }
    if (isLoopbackIp(address)) {
      if (hostnameIsLoopback) continue;
      throw new Error('Research URL host resolved to a loopback address');
    }
    if (isPrivateOrReservedIp(address) && !allowPrivate) {
      throw new Error('Research URL must not target private or reserved networks');
    }
  }

  const pinned = resolved.find((entry) => entry.family === 4) || resolved[0];
  return {
    parsed,
    hostname,
    address: pinned.address,
    family: pinned.family,
  };
}

function assertHttpOrHttpsUrl(rawUrl, label = 'URL') {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || ''));
  } catch {
    throw new Error(`Invalid ${label}`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${label} must be http or https`);
  }
  return parsed;
}

/**
 * Validate a BYOK / OpenAI-compatible model base URL.
 * Allows loopback and private LAN targets (local gateways, including
 * private `*.internal` names), but blocks link-local, known cloud-metadata
 * hosts, and credentialed URLs. Hostnames are DNS-resolved and the chosen
 * address is returned so callers can pin the subsequent connection.
 */
async function assertSafeModelBaseUrl(rawUrl, label = 'Model base URL') {
  const parsed = assertHttpOrHttpsUrl(rawUrl, label);
  if (parsed.username || parsed.password) {
    throw new Error(`${label} must not include credentials`);
  }
  const hostname = normalizeHostname(parsed.hostname);
  if (isExactMetadataHostname(hostname)) {
    throw new Error(`${label} host is not allowed`);
  }

  const resolved = net.isIP(hostname)
    ? [{ address: hostname, family: net.isIP(hostname) }]
    : await dns.lookup(hostname, { all: true });

  if (!resolved.length) {
    throw new Error(`${label} host could not be resolved`);
  }

  for (const entry of resolved) {
    if (isLinkLocalOrMetadataIp(entry.address)) {
      throw new Error(`${label} must not target link-local or metadata addresses`);
    }
  }

  const pinned = resolved.find((entry) => entry.family === 4) || resolved[0];
  return {
    parsed,
    hostname,
    address: pinned.address,
    family: pinned.family,
    href: parsed.href,
    toString() {
      return parsed.href;
    },
  };
}

/**
 * HTTP(S) fetch that connects only to a previously validated address while
 * preserving the original Host / SNI. Used for model-base requests so DNS
 * rebinding cannot swap a safe answer for a link-local/metadata address.
 */
function fetchPinnedUrl(target, extra = {}) {
  const protocol = target.parsed.protocol === 'https:' ? https : http;
  const defaultPort = target.parsed.protocol === 'https:' ? 443 : 80;
  const headers = { ...(extra.headers || {}) };
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === 'host') delete headers[key];
  }
  const options = {
    protocol: target.parsed.protocol,
    hostname: target.hostname,
    port: target.parsed.port ? Number(target.parsed.port) : defaultPort,
    path: `${target.parsed.pathname}${target.parsed.search}`,
    method: extra.method || 'GET',
    headers,
    lookup: createPinnedLookup(target.address, target.family),
  };
  if (target.parsed.protocol === 'https:' && !net.isIP(target.hostname)) {
    options.servername = target.hostname;
  }

  return new Promise((resolve, reject) => {
    const request = protocol.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          async text() {
            return body.toString('utf8');
          },
          async json() {
            return JSON.parse(body.toString('utf8'));
          },
        });
      });
    });

    if (extra.signal) {
      if (extra.signal.aborted) {
        request.destroy();
        reject(extra.signal.reason || new Error('Aborted'));
        return;
      }
      const onAbort = () => {
        request.destroy();
        reject(extra.signal.reason || new Error('Aborted'));
      };
      extra.signal.addEventListener('abort', onAbort, { once: true });
      request.on('close', () => extra.signal.removeEventListener('abort', onAbort));
    }

    request.on('error', reject);
    if (extra.body) request.write(extra.body);
    request.end();
  });
}

module.exports = {
  validateHttpUrl,
  resolveRedirectUrl,
  assertSafeResearchUrl,
  assertHttpOrHttpsUrl,
  assertSafeModelBaseUrl,
  fetchPinnedUrl,
  createPinnedLookup,
  normalizeHostname,
  isLoopbackIp,
  isPrivateOrReservedIp,
  isLinkLocalOrMetadataIp,
  isMetadataHostname,
  isExactMetadataHostname,
};
