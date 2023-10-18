import express from 'express';
const router = express.Router();
import debug from 'debug';
const debugProduct = debug('app.ProductRouter');
import { getProducts,getProductById,getProductByName,addNewProduct,updateProduct,deleteProduct } from '../../database.js';
import { ObjectId } from 'mongodb';
import {validBody} from '../../middleware/validBody.js';
import {validParams} from '../../middleware/validId.js';
import Joi from 'joi';

const newProductSchema = Joi.object({
    name:Joi.string().trim().min(1).max(100).required(),
    description:Joi.string().trim().min(1).max(250).required(),
    category:Joi.string().trim().min(1).max(250).required(),
    price:Joi.number().min(0).max(10000).required(),
});
const checkIdSchema = Joi.object({
    id:Joi.string().trim().required(),
});
const checkNameSchema = Joi.object({
    name:Joi.string().trim().min(1).max(100).required(),
});

router.use(express.urlencoded({extended:false}));

router.get('/list',async (req,res)=>{
    debugProduct('Product list route hit.');
    try{
        const products = await getProducts();
        res.status(200).json(products);
        console.log(products);
    }catch (err) {
        res.status(404).json({error:err.stack})
        console.log(err);
    }
});

router.get('/id/:id',validParams(checkIdSchema),async (req,res)=>{
    const id = req.params.id;
    try{
        const product = await getProductById(id);
        res.status(200).json(product);
    }catch(err){
        res.status(400).json({error:err.stack});
    }
});
router.get('/name/:name',validParams(checkNameSchema),async(req,res)=>{
    const name = req.params.name;
    try{
        const product = await getProductByName(name);
        res.status(200).json(product);
    }catch(err){
        res.status(400).json({error:err.stack});
    }
});

router.post('/new',validBody(newProductSchema),async(req,res)=>{
    const product = req.body;
    if(!product.name || !product.description || !product.category || !product.price ){
        res.status(400).json({ error: 'Missing or invalid data for a new product' });
    }
    else if(parseFloat(product.price) < 0.50){
        res.status(401).json({error: 'Minimum product price is 50 cents.'});
    }
    else{
        const results = await addNewProduct(product);
        if (results.productExists) {
            res.status(402).json({ error: 'Product Already Exists' });
        } else {
        res.status(200).json({result: results.result, addedProduct: product})
        }
    }
});
router.put('/:id',validParams(checkIdSchema),async (req,res)=>{
    const id = req.params.id;
    const productIdFound = await getProductById(id);
    if(!productIdFound){
        res.status(405).json({error: `Product ${id} not found.`});
    }else{
        const {name,description,category,price} = req.body;
        const updatedProduct = {
            name: name || productIdFound.name,
            description: description || productIdFound.description,
            category: category || productIdFound.category,
            price: price || productIdFound.price,
            lastUpdatedOn: new Date()
        };
        if(req.body._id || req.body.id){
            res.status(404).json({error: `Cannot reassign the product id here.`});
        }
        try{
            const result = await updateProduct(id,updatedProduct);
            if(result.modifiedCount == 1){
                res.status(200).json({message: `Product ${id} updated!`});
            }else{
                res.status(403).json({error: `You can only update the product name, description, category or price.`})
            }

        }catch(error){
            console.error(error);
            res.status(500).json({error: `An error occurred while processing your request.`});
        }
    }
});
router.delete('/:id',validParams(checkIdSchema),async (req,res)=>{
    const id = req.params.id;
    try{
        const deletedResult = await deleteProduct(id);
        if(deletedResult.productExists){
            res.status(200).json(`Product ${id} deleted from inventory.`)
        }else{
            res.status(400).json({error:"An error occurred while processing your request."});
        }
    }catch(err){
        console.log(err)
        res.status(401).json({error:"An error occurred while processing your request."})
    }
});

export { router as ProductRouter };