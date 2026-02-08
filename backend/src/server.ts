import 'dotenv/config'; // Load env vars before anything else
import app from './app';
import { bootstrap } from './utils/bootstrap';
import { Server } from 'http';

const PORT = process.env.PORT || 3008;

let server: Server;

import schedulerService from './services/scheduler.service';

const startServer = async () => {
    // Bootstrap admin user if needed
    await bootstrap();

    // Initialize scheduler (will check env var)
    schedulerService.init();

    const expressServer = app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV}`);
    });

    server = expressServer;
    // Initialize Socket.io
    const { initSocket } = require('./services/socket.service');
    initSocket(server);
};

startServer();

// Handle unhandled promise rejections
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
