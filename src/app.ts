import fs from 'fs';
import path from 'path';
import express from 'express';
import { Recipe } from './types/recipe';

const recipesFilePath = path.join(__dirname, 'recipes', 'recipes.json');

function loadRecipes(): Recipe[] {
    const data = fs.readFileSync(recipesFilePath, 'utf-8');
    return JSON.parse(data);
}

function generateHtml(recipes: Recipe[]): string {
    const items = recipes.map(recipe => `
        <div class="recipe">
            <h2>${recipe.nombre}</h2>
            <h4>Ingredientes:</h4>
            <ul>
                ${recipe.ingredientes.map(ing => `<li>${ing}</li>`).join('')}
            </ul>
            <h4>Instrucciones:</h4>
            <p>${recipe.instrucciones}</p>
        </div>
        <hr>
    `).join('\n');

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Lista de Recetas</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 2em; }
            .recipe { margin-bottom: 2em; }
        </style>
    </head>
    <body>
        <h1>Lista de Recetas</h1>
        ${items}
    </body>
    </html>
    `;
}

function generateEditHtml(recipes: Recipe[]): string {
    const items = recipes.map((recipe, idx) => `
        <form class="recipe-form" data-index="${idx}">
            <h2>
                <input name="nombre" value="${recipe.nombre}" />
            </h2>
            <h4>Ingredientes:</h4>
            <textarea name="ingredientes" rows="3">${recipe.ingredientes.join('\n')}</textarea>
            <h4>Instrucciones:</h4>
            <textarea name="instrucciones" rows="3">${recipe.instrucciones}</textarea>
            <button type="submit">Guardar</button>
            <hr>
        </form>
    `).join('\n');

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Editar Recetas</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 2em; }
            .recipe-form { margin-bottom: 2em; border: 1px solid #ccc; padding: 1em; }
            input, textarea { width: 100%; margin-bottom: 0.5em; }
        </style>
    </head>
    <body>
        <h1>Editar Recetas</h1>
        <div id="recipes">
            ${items}
        </div>
        <script>
            document.querySelectorAll('.recipe-form').forEach(form => {
                form.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const idx = this.dataset.index;
                    const data = {
                        nombre: this.nombre.value,
                        ingredientes: this.ingredientes.value.split('\\n'),
                        instrucciones: this.instrucciones.value
                    };
                    await fetch('/api/recipes/' + idx, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    alert('Receta actualizada');
                });
            });
        </script>
    </body>
    </html>
    `;
}

const app = express();
const port = 3000;

app.get('/', (_req, res) => {
    const recipes = loadRecipes();
    const html = generateHtml(recipes);
    res.send(html);
});

app.get('/editar', (_req, res) => {
    const recipes = loadRecipes();
    const html = generateEditHtml(recipes);
    res.send(html);
});

// Endpoint para actualizar una receta
app.use(express.json());
app.put('/api/recipes/:idx', (req, res) => {
    const idx = parseInt(req.params.idx, 10);
    const recipes = loadRecipes();
    if (recipes[idx]) {
        recipes[idx] = req.body;
        fs.writeFileSync(recipesFilePath, JSON.stringify(recipes, null, 4), 'utf-8');
        res.json({ ok: true });
    } else {
        res.status(404).json({ error: 'Receta no encontrada' });
    }
});

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});