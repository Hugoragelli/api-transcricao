module.exports = {
  apps: [
    {
      name: "ec2-audio-stt",
      script: "src/index.js",
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production", PORT: "3000" }
    }
  ]
};