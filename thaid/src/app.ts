import express, { Express, NextFunction, Request, Response } from 'express'
import 'log-timestamp'
import route from './route'
const app: Express = express()

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded( { limit: '500mb', extended: false }))

const port: number = Number(process.env.PORTS || "3000") ||  3000
const rootpath: string = "/"

app.use((req: Request, res:Response, next: NextFunction)=>{
    console.log(req.originalUrl)
    next()
})

app.use(rootpath, route)

app.use('*', (req: Request, res: Response) => {
    res.json({
        message: 'Hello Nodejs + Express + TypeScirpt!!',
    })
})


const all_routes = require('express-list-endpoints');
console.log(all_routes(app));

app.listen(port, () => console.log(`Application is running on port ${port}`))
