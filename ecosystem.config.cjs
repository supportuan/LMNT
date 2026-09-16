/** @type {import('pm2').StartOptions} */
module.exports = {
  apps: [
    {
      name: "lmnt",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "768M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
