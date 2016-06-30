/* eslint-disable */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSpies from 'chai-spies';

chai.use(chaiAsPromised);
chai.use(chaiSpies);

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:');
  console.error(error && error.stack || error);
});
