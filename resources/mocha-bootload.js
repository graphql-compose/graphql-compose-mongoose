import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:');
  console.error(error && error.stack || error);
});
