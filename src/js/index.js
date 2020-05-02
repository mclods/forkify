import Search from './models/Search';
import Recipe from './models/Recipe';
import List from './models/List';
import Likes from './models/Likes';
import * as searchView from './views/searchView';
import * as recipeView from './views/recipeView';
import * as listView from './views/listView';
import * as likesView from './views/likesView';
import { elements, renderLoader, clearLoader, warning } from './views/base';
import { imgData, imgData1 } from './config';
import jspdf from 'jspdf';

/*
! Global State of the App
* - Search Object
* - Current Recipe Object
* - Shopping List Object
* - Liked Recipes
*/
const state = {};

/*
    Search Controller
*/
const controlSearch = async () => {

    //TODO 1. Get query from view
    const query = searchView.getInput();

    if(query) {
        //TODO 2. Create new Search object and add to state
        state.search = new Search(query);

        //TODO 3. Prepare the UI for results
        searchView.clearInput();
        searchView.clearResults();
        renderLoader(elements.searchRes);

        try {
            //TODO 4. Search for recipes
            await state.search.getResults();

            //TODO 5. Render the results on UI
            clearLoader();
            searchView.renderResults(state.search.result);

            //TODO 6. Highlight if there is a previous recipe
            if(state.recipe && state.recipe.id) searchView.highlightSelected(state.recipe.id);
        } catch(error) {
            warning(error);
            clearLoader();
        }
    }

};

elements.searchForm.addEventListener('submit', e => {
    e.preventDefault();
    controlSearch();
});

elements.searchResPages.addEventListener('click', e => {
    const btn = e.target.closest('.btn-inline');
    if(btn) {
        const goToPage = parseInt(btn.dataset.goto, 10);
        searchView.clearResults();
        searchView.renderResults(state.search.result, goToPage);
    }
});

/*
    Recipe Controller
*/
const controlRecipe = async() => {

    //TODO 1. Get ID from url
    const id = window.location.hash.replace('#', '');
    
    if(id) {
         //TODO 2. Prepare UI for changes
        recipeView.clearRecipe();
        renderLoader(elements.recipe);

        //TODO 3. Highlight the selected search item
        if(state.search) searchView.highlightSelected(id);

        //TODO 4. Create new recipe object
        state.recipe = new Recipe(id);

        try {
            //TODO 5. Get recipe data and parse ingredients
            await state.recipe.getRecipe();
            state.recipe.parseIngredients();

            //TODO 6. Calculate servings and time
            state.recipe.calcTime();
            state.recipe.calcServings();

            //TODO 7. Render the recipe
            clearLoader();
            recipeView.renderRecipe(state.recipe, state.likes.isLiked(id));
        } catch(error) {
            warning(error);
        }
    }
};

['hashchange', 'load'].forEach(event => window.addEventListener(event, controlRecipe));

/*
    List Controller
*/
const controlList = () => {
    //TODO 1. Create a new list if there is none yet
    if(!state.list) state.list = new List();

    //TODO 2. Add each ingredient to the list and the UI
    state.recipe.ingredients.forEach(el => {
        const item = state.list.addItem(el.count, el.unit, el.ingredient);
        listView.renderItem(item);
    });

    listView.toggleListDownload(state.list.getNumList());
};

// Handle delete and update list item events
elements.shopping.addEventListener('click', e => {
    const id = e.target.closest('.shopping__item').dataset.itemid;

    // Handle delete event
    if(e.target.matches('.shopping__delete, .shopping__delete *')) {
        // Delete from state
        state.list.deleteItem(id);

        // Delete from UI
        listView.deleteItem(id);

        // Check download button
        listView.toggleListDownload(state.list.getNumList());
    } else if(e.target.matches('.shopping__count-value')) {
        const val = parseFloat(e.target.value, 10);
        if(val >= 0) {
            state.list.updateCount(id, val);
        }
    }
});

/*
    Likes Controller
*/
const controlLikes = () => {
    if(!state.likes) state.likes = new Likes();

    const currentId = state.recipe.id;
    if(!state.likes.isLiked(currentId)) {
        // User has not yet liked the current recipe
        //TODO 1. Add like to state
        const newLike = state.likes.addLike(currentId, state.recipe.title, state.recipe.author, state.recipe.img);

        //TODO 2. Toggle the like button
        likesView.toggleLikeBtn(true);

        //TODO 3. Add like to UI list
        likesView.renderLike(newLike);
    } else {
        // User has liked the current recipe
        //TODO 1. Remove like to state
        state.likes.deleteLike(currentId);

        //TODO 2. Toggle the like button
        likesView.toggleLikeBtn(false);

        //TODO 3. Remove like from UI list
        likesView.deleteLike(currentId);
    }

    likesView.toggleLikeMenu(state.likes.getNumLikes());
};

// Restore liked recipes on page reload and handle download button and warning symbol
window.addEventListener('load', () => {
    state.likes = new Likes();

    // Restore likes
    state.likes.readStorage();

    // Toggle like menu button
    likesView.toggleLikeMenu(state.likes.getNumLikes());

    // Render the existing likes
    state.likes.likes.forEach(like => likesView.renderLike(like));

    state.list = new List();

    // Toggle download button
    listView.toggleListDownload(state.list.getNumList());

    // Handle warning symbol
    elements.warning.style.visibility = 'hidden';
});

// Handling recipe button clicks
elements.recipe.addEventListener('click', e => {
    if(e.target.matches('.btn-decrease, .btn-decrease *')) {
        // Decrease button is clicked
        if(state.recipe.servings > 1) {
            state.recipe.updateServings('dec');
            recipeView.updateServingsIngredients(state.recipe);
        }
    } else if(e.target.matches('.btn-increase, .btn-increase *')) {
        // Increase button is clicked
        state.recipe.updateServings('inc');
        recipeView.updateServingsIngredients(state.recipe);
    } else if(e.target.matches('.recipe__btn--add, .recipe__btn--add *')) {
        // Add ingredients to shopping list
        controlList();
    } else if(e.target.matches('.recipe__love, .recipe__love *')) {
        // Add to likes
        controlLikes();
    }
});

/*
    PDF Creator
*/
document.querySelector('.download button').addEventListener('click', () => {
    const doc = new jspdf();
    
    doc.addImage(imgData, 'JPEG', 20, 15, 60, 20);
    doc.addImage(imgData1, 'PNG', 155, 6, 40, 40);
    doc.setFont("times");
    doc.setFontStyle("bolditalic");
    doc.setFontSize(11);
    doc.text('-- forkify Cart Master', 150, 51);

    doc.setFont('helvetica');
    doc.setFontStyle('bold');
    doc.setFontSize(14);
    doc.text('Your Shopping Cart', 20, 60);
    doc.line(20, 65, 180, 65);
    doc.setFont("courier");
    doc.setFontSize(12);
    doc.setFontStyle("normal");

    let flag = false;
    if(state.list) {
        let y = 75;
        state.list.items.forEach((el, i, arr) => {

            let count;
            if(el.count !== Math.floor(el.count)) {
                count = parseFloat(el.count.toFixed(2));
            } else {
                count = el.count;
            }

            doc.text(`${i+1})   ${count} ${el.unit} ${el.ingredient}` ,20, y);
            y += 5;
            flag = false;
            if(y === 285 && i<arr.length) {
                doc.line(20, 285, 190, 285);
                doc.setFontSize(9);
                doc.text('-- Generated by forkify --', 80, 290);
                flag = true;
                doc.setFontSize(12);
                doc.addPage();
                y = 15;
                flag = false;
            }
        });
    } else {
        doc.text('Nothing to buy!' ,20, 75);
        doc.line(20, 285, 190, 285);
        doc.setFontSize(9);
        doc.text('-- Generated by forkify --', 80, 290);
        flag = true;
    }

    if(flag === false) {
        doc.line(20, 285, 190, 285);
        doc.setFontSize(9);
        doc.text('-- Generated by forkify --', 80, 290);
    }


    doc.save('Shopping List.pdf');
});
