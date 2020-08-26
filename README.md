# postfzcommunitybot
Yet another telegram bot. Events in community

## установка:  
```  
git clone https://github.com/Zerginwan/postfzcommunitybot.git
cd ./postfzcommunitybot
npm update
cat > /etc/systemd/system/pfzc-bot.service << EOF
[Unit]
Description=Telegram bot '@PostFZCommunityBot'
After=syslog.target
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$(pwd)
ExecStart=nodejs $(pwd)/bot.js
RestartSec=10
Restart=always

[Install]
WantedBy=multi-user.target

EOF


systemctl daemon-reload
systemctl enable pfzc-bot.service
cp ./config.json.example ./config.json
nano ./config.json
```  
Убрать все комментарии, добавить токен, изменить ID чатов. После запустить:  
```
systemctl start pfzc-bot.service
systemctl status pfzc-bot.service
```