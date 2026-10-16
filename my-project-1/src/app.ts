import express from 'express';

class App {
    public express: express.Application;

    constructor() {
        this.express = express();
        this.middleware();
        this.routes();
    }

    private middleware(): void {
        this.express.use(express.json());
        this.express.use(express.urlencoded({ extended: true }));
    }

    private routes(): void {
        this.express.get('/', (req, res) => {
            res.send('Welcome to the TypeScript Application!');
        });

        // Define additional routes here
    }

    public start(port: number): void {
        this.express.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    }
}

export default App;