export function render404(hostname: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 - Not Found</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
    body {
      background-color: #0B0D12;
      color: #E2E8F0;
      font-family: 'JetBrains Mono', monospace;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    h1 {
      font-size: 2rem;
      margin-bottom: 1rem;
      color: #F87171;
    }
    p {
      font-size: 1rem;
      margin-bottom: 2rem;
      color: #94A3B8;
    }
    .hostname {
      color: #E2E8F0;
      font-weight: bold;
    }
    footer {
      position: absolute;
      bottom: 2rem;
      font-size: 0.875rem;
      color: #64748B;
    }
    footer a {
      color: #60A5FA;
      text-decoration: none;
    }
    footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <h1>404: no deployment routed to this host</h1>
  <p>Host: <span class="hostname">\${hostname}</span></p>
  <footer>
    Powered by <a href="http://voltage.localhost">Voltage</a>
  </footer>
</body>
</html>
  `.trim();
}
