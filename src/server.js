/*
  imports
*/
// https://testdriven.io/blog/deploying-a-node-app-to-google-cloud-with-kubernetes/
// https://github.com/testdrivenio/node-kubernetes
const express = require('express');
const bodyParser = require('body-parser');
const { Storage } = require('@google-cloud/storage');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const _ = require('underscore');
const ToJsonTransform = require('./transform');
const R = require('ramda');
const zlib = require('zlib');
const StreamFromPromise = require('stream-from-promise');

const app = express();
const PORT = process.env.PORT || 3000;
const storage = new Storage();
const secretClient = new SecretManagerServiceClient();

/*
  middleware
*/

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

/*
  routes
*/

app.get('/', (req, res) => {
  res.json('welcome to ugc api');
});

app.get('/reviews/:country/:lang', async (req, res) => {
  const name = 'projects/<PROJECT_ID>/secrets/node-kubernetes-secrets/versions/latest';
  try {

    const [version] = await secretClient.accessSecretVersion({
      name: name,
    });

    const secretsKey = JSON.parse(version.payload.data.toString());
    let isExists = _.filter(secretsKey.keys, function (item) {
      return item.key.indexOf(req.query.key || 'xxx') != -1;
    }); 
    //isExists = [{ "key": "4YNGuRrteB6GpPKd3NdKNJrVDv1t5Hzs", "expired": "2020-07-18T00:00:00" }]
    GCS_BUCKET = '<PROJECT_ID>-data';
    const gunzip = b => new Promise((resolve, reject) => {
      zlib.gunzip(b, (e, b) => {
        if (e) return reject(e);
        resolve(b);
      });
    });
    const parseReviewData = R.compose(
      R.map(JSON.parse),
      R.filter(Boolean),
      R.map(R.trim),
      R.split('\n'),
      b => b.toString('utf8')
    );

    const yotpoReviewData = p => ({
      reviewId: p.reviewId,
      contentLocale: p.contentLocale,
      productId: p.productId,
      productName:p.productName,
      productPageUrl :p.productPageUrl,
      productImageUrl:p.productImageUrl,
      productDescription:p.productDescription,
      productTags:p.productTags,
      groupName:p.groupName,
      currencyCode:p.currencyCode,
      moderationStatus: p.moderationStatus,
      contentCodes: p.contentCodes,
      reviewTitle: p.reviewTitle,
      reviewText: p.reviewText,
      primaryRating: {
        ratingValue: p.primaryRating.ratingValue,
        ratingRange: 5
      },
      secondaryRatings: {
        workAsExpected: {
          ratingValue: p.secondaryRatings.workAsExpected.ratingValue,
          ratingRange: 5
        },
        easyOfUse: {
          ratingValue: p.secondaryRatings.easyOfUse.ratingValue,
          ratingRange: 5
        },
        valueForMoney: {
          ratingValue: p.secondaryRatings.valueForMoney.ratingValue,
          ratingRange: 5
        },
        durability: {
          ratingValue: p.secondaryRatings.durability.ratingValue,
          ratingRange: 5
        },
        foodEaseOfPreparing: {
          ratingValue: p.secondaryRatings.foodEaseOfPreparing.ratingValue,
          ratingRange: 5
        },
        taste: {
          ratingValue: p.secondaryRatings.taste.ratingValue,
          ratingRange: 5
        },
        sustainabilitySortWaste: {
          ratingValue: p.secondaryRatings.sustainabilitySortWaste.ratingValue,
          ratingRange: 5
        },
        sustainabilitySaveEnergyOrWater: {
          ratingValue: p.secondaryRatings.sustainabilitySaveEnergyOrWater.ratingValue,
          ratingRange: 5
        },
        design: {
          ratingValue: p.secondaryRatings.design.ratingValue,
          ratingRange: 5
        }
      },
      isRecommended: p.isRecommended,
      numOfPositiveFeedback : p.numOfPositiveFeedback,
      numOfNegativeFeedback : p.numOfNegativeFeedback,
      reviewer: p.reviewer,
      comments : p.comments,
      submissionDatetime : p.submissionDatetime,
      latestModificationDatetime : p.latestModificationDatetime,
    });
    const makeProductTagMapper = categoryToProductTag => R.compose(
      R.defaultTo(DEFAULT_TAG),
      R.head,
      R.filter(Boolean),
      R.map(categoryKey => categoryToProductTag[categoryKey]),
      R.reverse,
      R.split('/'),
      R.pathOr('', ['catalogRef', 'id'])
    );

    const readReviewsFromGcs = (storage, blobFile) => (console.log(`reading gs://${GCS_BUCKET}/${blobFile}`), storage.bucket(GCS_BUCKET)
      .file(blobFile).download()
      .then(R.pipe(R.head, gunzip))
      .then(parseReviewData)
      .then(R.map(yotpoReviewData)));

    //const toJsonStream = () => { return new ToJsonTransform({ stringify: true }) };
    if (isExists.length > 0 && new Date() <= new Date(isExists[0].expired)) {
      const ps = [
        readReviewsFromGcs(storage, `exports/reviews/review_${req.params.country}_${req.params.lang}.jsonl.gz`)
      ];
      const [reviewData] = await Promise.all(ps);
      res.json({
        countryCode: req.params.country.toUpperCase(),
        langaugeCode: req.params.lang,
        reviews: reviewData
      });
    }
    else {
      res.status(401).json({
        "code": 401,
        "message": "API doesn't allow unregistered callers (callers without established identity). Please use API Key"
      });
    }
  }
  catch (error) {
    if (error.code == 404) {
      res.status(404).json({
        "code": 404,
        "message": "Data not found"
      });
    }
    else {
      console.log(error);
      res.status(500).json({
        "code": 500,
        "message": "Internal Error"
      });
    }
  }
});

/*
  run server
*/

app.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});

