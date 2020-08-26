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
systemctl start pfzc-bot.service
systemctl status pfzc-bot.service
```  
После - зайти в bot.js и установить верную конфигурацию (admin_id, TG-token, etc.), после чего  
```  
service pfzc-bot restart
```