import axios from 'axios';
import { warning } from '../views/base';

export default class Search {

    constructor(query) {
        this.query = query;
    }

    async getResults() {
        //! No Proxy Required
        //! No Key Required
        try {
            const res = await axios(`https://forkify-api.herokuapp.com/api/search?&q=${this.query}`);
            this.result = res.data.recipes;
            // console.log(this.result);
        } catch(error) {
            warning(error);
        }
    }

}