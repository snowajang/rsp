import auth from './auth'
import cb from './callback'
import { Router } from 'express'
const route = Router()

const apppaths: string = process.env.apppaths || ""

route.get(`${apppaths}/auth`, auth._get)
route.get(`${apppaths}/callback`, cb._get)

export default route
