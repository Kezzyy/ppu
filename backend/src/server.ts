import 'dotenv/config';
import app from './app';
import { bootstrap } from './utils/bootstrap';
import { Server } from 'http';

const PORT = process.env.PORT || 3008;

let server: Server;

import schedulerService from './services/scheduler.service';

const startServer = async () => {
    await bootstrap();

    schedulerService.init();

    const expressServer = app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV}`);
    });

    server = expressServer;
    const { initSocket } = require('./services/socket.service');
    initSocket(server);
};

startServer();

process.on('unhandledRejection', (err: Error) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    if (server) {
        server.close(() => {
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
});
