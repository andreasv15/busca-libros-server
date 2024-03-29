const router = require("express").Router();
const UserModel = require("../models/User.model");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const isAuthenticated = require("../middleware/isAuthenticated");



// rutas de auth
//? POST "/api/auth/signup" => registro del usuario
router.post("/signup", async (req,res,next) => {

    const { nombre, username, password } = req.body;

    //! VALIDACIONES DE BACKEND
    if (!nombre || !username || !password) {
        res.status(400).json({ errorMessage: "Los campos no están completos." });
        return;
    }

    if (username.length < 4 || nombre.length < 4 ) {
        res.status(400).json({ errorMessage: "Los campos username y nombre requieren más de 4 caracteres." });
        return;
    }

    if (password.length < 7 ) {
        res.status(400).json({ errorMessage: "La contraseña requieren 8 caracteres como mínimo." });
        return;
    }

    try {
        //* busca si hay algun usuario con el username pasado por parametro
        const foundUserUsername = await UserModel.findOne({ username });

        if (foundUserUsername !== null) {
            res.status(400).json({ errorMessage: "El nombre de usuario ya está registrado." });
            return;
        }

        const salt = await bcryptjs.genSalt(10);
        const hashPassowrd = await bcryptjs.hash(password, salt);

        await UserModel.create({
            nombre,
            username,
            password: hashPassowrd,            
        })

        res.json("Todo bien, usuario creado.");
        
    } catch (error) {
        next(error)
    }
})


//? POST "/api/auth/login" => chequeo de credenciales
router.post("/login", async (req, res, next) => {

    const { username, password } = req.body;

    if (!username || !password) {
        res.status(400).json({ errorMessage: "Los campos no están completos." });
        return;
    }

    try {
        const foundUser = await UserModel.findOne({ username });         
        
        if (foundUser === null) {
            res.status(400).json({ errorMessage: "El usuario introducido no está registrado." });
            return;
        }

        // Si el usuario existe, comprobamos que la contraseña introducida es la correcta usando el metodo compare
        const checkPassword = await bcryptjs.compare( password, foundUser.password )

        // console.log("pass: ", checkPassword); // devuelve true o false 

        if (checkPassword === false) {
            res.status(401).json({ errorMessage: "La contraseña no es correcta." }); // status 401 --> sin autorizacion
            return;
        }

        // Credenciales correctas, procedemos a crear el token
        const payload = {
            _id: foundUser._id,
            nombre: foundUser.nombre,
            username: foundUser.username
        }

        const authToken = jwt.sign(
            payload,
            process.env.TOKEN_SECRET, //* palabra secreta que solo tendrá el servidor, similar al SESSION_SECRET
            { 
                algorithm: "HS256",
                expiresIn: "12h"
            }
         );

         res.json({ authToken: authToken }); //* se lo enviamos al usuario
            

    } catch (error) {
        next(error);
    }
})




//? GET "/api/auth/verify" => va a verificar si un token es valido o no, la ruta se usa para el flujo de Front end
router.get("/verify", isAuthenticated, (req,res,next) => {
    // 1. Checkeamos que el token es valido
    // console.log("payload: ", req.payload); // similar al req.session.user
    // console.log("Pasando por la ruta, todo bien con el middleware");

    // 2. Enviar al front end la info del usuario del token
    res.json(req.payload);
    
})


module.exports = router;