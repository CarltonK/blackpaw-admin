import {setGlobalOptions} from 'firebase-functions';

setGlobalOptions({ 
    maxInstances: 2,
    minInstances: 0,
});
