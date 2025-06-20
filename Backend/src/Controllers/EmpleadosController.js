import empleadosModel from "../Models/Empleados.js";
import bcryptjs from "bcryptjs"; 

const empleadosCon = {};

empleadosCon.get = async (req , res) => {
    const newEmpleado= await empleadosModel.find();
    res.status(200).json(newEmpleado);
};

empleadosCon.post = async (req, res) => {
    const {name,lastName,email,id,birthDate,password,phone,address}=req.body;

      const validarEmpleado = await empleadosModel.findOne({email})
        if(validarEmpleado){
            return res.status(400).json({message: "Empleado ya registrado"});
        };

        const encriptarContraHash = await bcryptjs.hash(password,10);


    const newEmpleado = new empleadosModel({name,lastName,email,id,birthDate,password:encriptarContraHash,phone,address})

    await newEmpleado.save();
    res.status(200).json({Message:"Empleado agregado correctamente"});
}

empleadosCon.put = async (req,res) => {
    const {name,lastName,email,id,birthDate,password,phone,address}=req.body;

    const encriptarContraHash = await bcryptjs.hash(password,10);

    await empleadosModel.findByIdAndUpdate(
        req.params.id,{
            name,
            lastName,
            email,
            id,
            birthDate,
            password:encriptarContraHash,
            phone,
            address
        },{new:true}
    )
    res.status(200).json({Message: "Empleado actualizado correctamente"})
};

empleadosCon.delete = async (req ,res) => {
    const deleteEmpleado = await empleadosModel.findByIdAndDelete(req.params.id);
    if(!deleteEmpleado){
       return  res.status(200).json({Message: "Empleado no localizaco"})
    }
    res.status(200).json({Message: "Empleado eliminado correctamente"});
}


export default empleadosCon;