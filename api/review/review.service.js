import { dbService } from '../../services/db.service.js'
import { logger } from '../../services/logger.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'
import mongodb from 'mongodb'
const { ObjectId } = mongodb

async function query(filterBy = {}) {
    try {
        const criteria = _buildCriteria(filterBy)
        const collection = await dbService.getCollection('review')
        // const reviews = await collection.find(criteria).toArray()
        var reviews = await collection.aggregate([
            {
                $match: criteria
            },
            {
                $lookup:
                {
                    localField: 'userId',
                    from: 'user',
                    foreignField: '_id',
                    as: 'byUser'
                }
            },
            {
                $unwind: '$byUser'
            },
            {
                $lookup:
                {
                    localField: 'toyId',
                    from: 'toy',
                    foreignField: '_id',
                    as: 'aboutToy'
                }
            },
            {
                $unwind: '$aboutToy'
            }
        ]).toArray()
        // console.log(reviews);
        reviews = reviews.map(review => {
            review.byUser = { _id: review.byUser._id, fullname: review.byUser.fullname }
            review.aboutToy = { _id: review.aboutToy._id, name: review.aboutToy.name }
            // review.aboutUser = { _id: review.aboutUser._id, fullname: review.aboutUser.fullname }
            delete review.byUser._id
            delete review.aboutToy._id
            delete review.userId
            delete review.toyId
            console.log('review ---> ', review)
            return review
        })

        return reviews
    } catch (err) {
        logger.error('cannot find reviews', err)
        throw err
    }
}

async function remove(reviewId) {
    try {
        const store = asyncLocalStorage.getStore()
        const { loggedinUser } = store
        const collection = await dbService.getCollection('review')
        // remove only if user is owner/admin
        const criteria = { _id: ObjectId(reviewId) }
        if (!loggedinUser.isAdmin) criteria.byUser = ObjectId(loggedinUser._id)
        const { deletedCount } = await collection.deleteOne(criteria)
        return deletedCount
    } catch (err) {
        logger.error(`cannot remove review ${reviewId}`, err)
        throw err
    }
}


async function add(review) {
    try {
        const reviewToAdd = {
            userId: ObjectId(review.userId),
            toyId: ObjectId(review.toyId),
            txt: review.txt
        }
        console.log("🚀 ~ add inside try --> ~ reviewToAdd:", reviewToAdd)


        const collection = await dbService.getCollection('review')
        await collection.insertOne(reviewToAdd)
        console.log('reviewToAdd -> ', reviewToAdd)
        return reviewToAdd
    } catch (err) {
        logger.error('cannot insert review', err)
        throw err
    }
}

function _buildCriteria(filterBy) {
    const criteria = {}
    if (filterBy.userId) criteria.userId = ObjectId(filterBy.userId)
    return criteria
}

export const reviewService = {
    query,
    remove,
    add
}


