// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Crypto Price Guess - Anonymous Price Prediction Market
/// @notice A privacy-preserving prediction market where users submit encrypted price predictions
/// @dev Predictions are encrypted using FHE and only decrypted after the prediction period ends
contract CryptoPriceGuess is SepoliaConfig {

    constructor() {
        priceFeedAdmin = msg.sender;
        authorizedPriceFeeders[msg.sender] = true;
    }
    enum TokenType {
        BTC,
        ETH
    }

    enum BallType {
        CRYSTAL,
        PREDICTION,
        VAULT
    }

    struct CryptoBall {
        BallType ballType;
        uint256 generationTime;
        uint256 powerLevel;
        address owner;
        bool isActive;
    }

    struct PredictionEvent {
        string title;
        TokenType tokenType;
        uint256 targetDate;
        uint256 endTime;
        bool isActive;
        bool isFinalized;
        address admin;
        uint256 totalPredictions;
        uint256 actualPrice; // Set by admin after target date
        euint32 encryptedPriceSum; // Sum of all encrypted predictions
        uint32 decryptedAveragePrice; // Decrypted average after finalization
    }

    struct UserPrediction {
        euint32 encryptedPrice;
        uint256 timestamp;
        bool exists;
    }

    PredictionEvent[] public predictionEvents;

    // Mapping: eventId => user => prediction
    mapping(uint256 => mapping(address => UserPrediction)) public userPredictions;

    // Mapping: requestId => eventId (for decryption callbacks)
    mapping(uint256 => uint256) private _requestToEvent;

    // CryptoBall system
    CryptoBall[] public cryptoBalls;
    mapping(address => uint256[]) public userBalls;

    // CryptoBall collection system
    struct BallCollection {
        string name;
        address owner;
        uint256[] ballIds;
        uint256 createdAt;
        bool isPublic;
    }

    BallCollection[] public ballCollections;
    mapping(address => uint256[]) public userCollections;

    // Price oracle system
    struct PriceData {
        uint256 price;
        uint256 timestamp;
        address updater;
        bool isValid;
    }

    mapping(TokenType => PriceData) public latestPrices;
    mapping(TokenType => PriceData[]) public priceHistory;

    // Price feeder authorization
    mapping(address => bool) public authorizedPriceFeeders;
    address public priceFeedAdmin;

    // User preferences system
    struct UserPreferences {
        bool emailNotifications;
        bool priceAlerts;
        uint256 minAlertThreshold; // Minimum price change for alerts (in basis points)
        TokenType preferredToken; // BTC or ETH
        bool autoGenerateBalls;
        bool publicProfile;
        string displayName;
        uint256 theme; // 0: light, 1: dark, 2: auto
    }

    mapping(address => UserPreferences) public userPreferences;
    mapping(address => bool) public hasSetPreferences;

    // Encrypted storage system
    struct EncryptedStorage {
        euint32 storedValue;
        address owner;
        uint256 timestamp;
        bool isEncrypted;
    }

    EncryptedStorage[] public encryptedStorages;
    mapping(address => uint256[]) public userEncryptedStorages;
    
    // Events
    event PredictionEventCreated(
        uint256 indexed eventId,
        string title,
        TokenType tokenType,
        address indexed admin
    );
    event PredictionSubmitted(
        uint256 indexed eventId,
        address indexed user
    );
    event PredictionEventEnded(uint256 indexed eventId);
    event FinalizeRequested(uint256 indexed eventId, uint256 requestId);
    event PredictionEventFinalized(
        uint256 indexed eventId,
        uint32 decryptedAveragePrice,
        uint256 actualPrice
    );
    event ActualPriceSet(uint256 indexed eventId, uint256 actualPrice);

    // CryptoBall events
    event CryptoBallGenerated(uint256 indexed ballId, address owner, BallType ballType); // BUG: 参数顺序错误，应该先ballId再owner
    event BallPowerUpgraded(uint256 indexed ballId, uint256 newPowerLevel, address owner);

    // Collection events
    event CollectionCreated(uint256 indexed collectionId, address indexed owner, string name);
    event BallAddedToCollection(uint256 indexed collectionId, uint256 indexed ballId, address owner);
    event BallRemovedFromCollection(uint256 indexed collectionId, uint256 indexed ballId, address owner);

    // Price oracle events
    event PriceUpdated(TokenType indexed tokenType, uint256 price, uint256 timestamp, address updater);
    event PriceFeedAuthorized(address indexed feeder, bool authorized);

    // User preferences events
    event UserPreferencesUpdated(address indexed user);
    event PriceAlertTriggered(address indexed user, TokenType tokenType, uint256 price, uint256 change);

    // Encrypted storage events
    event ValueStored(uint256 indexed storageId, address indexed owner);
    event ValueRetrieved(uint256 indexed storageId, address indexed owner, uint32 decryptedValue);

    // Transfer events
    event BallTransferred(address indexed from, uint256 indexed ballId, address indexed to);
    event StorageTransferred(uint256 storageId, address from, address to);

    modifier onlyAdmin(uint256 _eventId) {
        require(predictionEvents[_eventId].admin == msg.sender, "Only admin can perform this action");
        _;
    }

    modifier eventExists(uint256 _eventId) {
        require(_eventId < predictionEvents.length, "Event does not exist");
        _;
    }

    modifier eventActive(uint256 _eventId) {
        require(predictionEvents[_eventId].isActive, "Event is not active");
        require(block.timestamp < predictionEvents[_eventId].endTime, "Event has ended");
        require(!predictionEvents[_eventId].isFinalized, "Event is finalized");
        _;
    }

    /// @notice Create a new prediction event
    /// @param _title The title of the prediction event
    /// @param _tokenType The token type (BTC or ETH)
    /// @param _targetDate The target date for price prediction (Unix timestamp)
    /// @param _durationInHours Duration of the prediction period in hours
    function createPredictionEvent(
        string memory _title,
        TokenType _tokenType,
        uint256 _targetDate,
        uint256 _durationInHours
    ) external returns (uint256) {
        require(_targetDate > block.timestamp, "Target date must be in the future");
        require(_durationInHours > 0, "Duration must be greater than 0");

        uint256 eventId = predictionEvents.length;
        
        PredictionEvent storage newEvent = predictionEvents.push();
        newEvent.title = _title;
        newEvent.tokenType = _tokenType;
        newEvent.targetDate = _targetDate;
        newEvent.endTime = block.timestamp + (_durationInHours * 1 hours);
        newEvent.isActive = true;
        newEvent.isFinalized = false;
        newEvent.admin = msg.sender;
        newEvent.totalPredictions = 0;
        newEvent.actualPrice = 0;

        emit PredictionEventCreated(eventId, _title, _tokenType, msg.sender);
        
        return eventId;
    }

    /// @notice Submit an encrypted price prediction
    /// @param _eventId The ID of the prediction event
    /// @param _encryptedPrice The encrypted price prediction (in USD * 100, e.g., 50000 = $50,000)
    /// @param inputProof The proof for the encrypted input
    /// @dev Users encrypt their price prediction before submitting
    function submitPrediction(
        uint256 _eventId,
        externalEuint32 _encryptedPrice,
        bytes calldata inputProof
    ) external eventExists(_eventId) eventActive(_eventId) {
        require(!userPredictions[_eventId][msg.sender].exists, "Already submitted prediction");

        PredictionEvent storage event_ = predictionEvents[_eventId];

        // Convert external encrypted input to internal euint32
        euint32 encryptedPrice = FHE.fromExternal(_encryptedPrice, inputProof);

        // Store user prediction
        userPredictions[_eventId][msg.sender] = UserPrediction({
            encryptedPrice: encryptedPrice,
            timestamp: block.timestamp,
            exists: true
        });

        // Add the encrypted price to the sum
        if (event_.totalPredictions == 0) {
            event_.encryptedPriceSum = encryptedPrice;
        } else {
            event_.encryptedPriceSum = FHE.add(event_.encryptedPriceSum, encryptedPrice);
        }

        // Grant permissions
        FHE.allowThis(event_.encryptedPriceSum);
        FHE.allow(event_.encryptedPriceSum, event_.admin);

        event_.totalPredictions++;

        emit PredictionSubmitted(_eventId, msg.sender);
    }

    /// @notice Submit multiple encrypted price predictions in batch
    /// @param _eventIds Array of prediction event IDs
    /// @param _encryptedPrices Array of encrypted price predictions
    /// @param _inputProofs Array of proofs for the encrypted inputs
    /// @dev Batch submission for improved efficiency
    function submitBatchPredictions(
        uint256[] calldata _eventIds,
        externalEuint32[] calldata _encryptedPrices,
        bytes[] calldata _inputProofs
    ) external {
        require(_eventIds.length == _encryptedPrices.length, "Array length mismatch");
        require(_eventIds.length == _inputProofs.length, "Array length mismatch");
        require(_eventIds.length > 0, "Cannot submit empty batch");
        require(_eventIds.length <= 10, "Batch size too large");

        for (uint256 i = 0; i < _eventIds.length; i++) {
            uint256 eventId = _eventIds[i];

            // Validate event exists and is active
            require(eventId < predictionEvents.length, "Event does not exist");
            PredictionEvent storage event_ = predictionEvents[eventId];
            require(event_.isActive, "Event is not active");
            require(block.timestamp < event_.endTime, "Event has ended");
            require(!event_.isFinalized, "Event is finalized");

            // Check user hasn't already predicted
            require(!userPredictions[eventId][msg.sender].exists, "Already submitted prediction for event");

            // Convert external encrypted input to internal euint32
            euint32 encryptedPrice = FHE.fromExternal(_encryptedPrices[i], _inputProofs[i]);

            // Store user prediction
            userPredictions[eventId][msg.sender] = UserPrediction({
                encryptedPrice: encryptedPrice,
                timestamp: block.timestamp,
                exists: true
            });

            // Add the encrypted price to the sum
            if (event_.totalPredictions == 0) {
                event_.encryptedPriceSum = encryptedPrice;
            } else {
                event_.encryptedPriceSum = FHE.add(event_.encryptedPriceSum, encryptedPrice);
            }

            // Grant permissions
            FHE.allowThis(event_.encryptedPriceSum);
            FHE.allow(event_.encryptedPriceSum, event_.admin);

            event_.totalPredictions++;

            emit PredictionSubmitted(eventId, msg.sender);
        }
    }

    /// @notice Get the encrypted price sum (only admin can decrypt)
    /// @param _eventId The ID of the prediction event
    /// @return The encrypted sum of all predictions
    function getEncryptedPriceSum(
        uint256 _eventId
    ) external view eventExists(_eventId) returns (euint32) {
        return predictionEvents[_eventId].encryptedPriceSum;
    }

    /// @notice End a prediction event (anyone can call after end time)
    /// @param _eventId The ID of the prediction event
    function endPredictionEvent(uint256 _eventId) external eventExists(_eventId) {
        PredictionEvent storage event_ = predictionEvents[_eventId];
        require(event_.isActive, "Event not active");
        require(block.timestamp >= event_.endTime, "Event has not ended yet");

        event_.isActive = false;
        emit PredictionEventEnded(_eventId);
    }

    /// @notice Set the actual price after target date (admin only)
    /// @param _eventId The ID of the prediction event
    /// @param _actualPrice The actual price at target date (in USD * 100)
    function setActualPrice(
        uint256 _eventId,
        uint256 _actualPrice
    ) external eventExists(_eventId) onlyAdmin(_eventId) {
        PredictionEvent storage event_ = predictionEvents[_eventId];
        require(block.timestamp >= event_.targetDate, "Target date not reached");
        require(_actualPrice > 0, "Actual price must be greater than 0");

        event_.actualPrice = _actualPrice;
        emit ActualPriceSet(_eventId, _actualPrice);
    }

    /// @notice Request decryption and calculate average prediction (admin only)
    /// @param _eventId The ID of the prediction event
    function finalizePredictionEvent(uint256 _eventId) external eventExists(_eventId) onlyAdmin(_eventId) {
        PredictionEvent storage event_ = predictionEvents[_eventId];
        require(!event_.isActive, "Event still active");
        require(!event_.isFinalized, "Event already finalized");
        require(event_.totalPredictions > 0, "No predictions to finalize");

        // Request decryption for the encrypted price sum
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(event_.encryptedPriceSum);

        uint256 requestId = FHE.requestDecryption(cts, this.decryptionCallback.selector);
        _requestToEvent[requestId] = _eventId;
        emit FinalizeRequested(_eventId, requestId);
    }

    /// @notice Callback called by the FHE decryption oracle
    /// @dev Expects the decrypted sum in bytes
    function decryptionCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes[] memory /*signatures*/
    ) public returns (bool) {
        uint256 eventId = _requestToEvent[requestId];
        PredictionEvent storage event_ = predictionEvents[eventId];
        require(!event_.isFinalized, "Event already finalized");
        require(!event_.isActive, "Event still active");

        // Parse the decrypted sum (uint32)
        require(cleartexts.length >= 4, "Invalid cleartexts length");
        uint32 decryptedSum;
        assembly {
            // Read 4 bytes starting at offset 32 (skip bytes length slot)
            decryptedSum := shr(224, mload(add(cleartexts, 32)))
        }

        // Calculate average price (sum / totalPredictions)
        // Note: This is a simplified calculation. In production, consider using euint32 division
        uint32 averagePrice = decryptedSum / uint32(event_.totalPredictions);
        
        event_.decryptedAveragePrice = averagePrice;
        event_.isFinalized = true;

        emit PredictionEventFinalized(eventId, averagePrice, event_.actualPrice);
        return true;
    }

    /// @notice Get the decrypted average price (only available after finalize)
    /// @param _eventId The ID of the prediction event
    function getDecryptedAveragePrice(
        uint256 _eventId
    ) external view eventExists(_eventId) returns (uint32) {
        require(predictionEvents[_eventId].isFinalized, "Event not finalized");
        return predictionEvents[_eventId].decryptedAveragePrice;
    }

    /// @notice Get prediction event details
    /// @param _eventId The ID of the prediction event
    function getPredictionEvent(
        uint256 _eventId
    ) external view eventExists(_eventId) returns (
        string memory title,
        TokenType tokenType,
        uint256 targetDate,
        uint256 endTime,
        bool isActive,
        bool isFinalized,
        address admin,
        uint256 totalPredictions,
        uint256 actualPrice,
        uint32 decryptedAveragePrice
    ) {
        PredictionEvent storage event_ = predictionEvents[_eventId];
        return (
            event_.title,
            event_.tokenType,
            event_.targetDate,
            event_.endTime,
            event_.isActive,
            event_.isFinalized,
            event_.admin,
            event_.totalPredictions,
            event_.actualPrice,
            event_.decryptedAveragePrice
        );
    }

    /// @notice Get total number of prediction events
    function getEventCount() external view returns (uint256) {
        return predictionEvents.length;
    }

    /// @notice Check if a user has submitted a prediction
    function hasUserPredicted(uint256 _eventId, address _user) external view returns (bool) {
        return userPredictions[_eventId][_user].exists;
    }

    /// @notice Get prediction statistics for an event
    /// @param _eventId The event ID
    function getPredictionStatistics(uint256 _eventId) external view eventExists(_eventId) returns (
        uint256 totalPredictions,
        uint256 activePredictions,
        uint256 finalizedPredictions,
        uint256 averagePredictionAge,
        uint256 uniquePredictors
    ) {
        PredictionEvent storage event_ = predictionEvents[_eventId];

        uint256 activeCount = 0;
        uint256 finalizedCount = 0;
        uint256 totalAge = 0;
        uint256 predictorCount = 0;

        // This is a simplified statistics calculation
        // In production, you might want to store more detailed statistics
        if (event_.isFinalized) {
            finalizedCount = event_.totalPredictions;
        } else if (event_.isActive) {
            activeCount = event_.totalPredictions;
        }

        // Calculate average prediction age (simplified)
        if (event_.totalPredictions > 0) {
            totalAge = (block.timestamp - event_.targetDate) * event_.totalPredictions;
            averagePredictionAge = totalAge / event_.totalPredictions;
        }

        // For unique predictors, we'd need additional tracking
        // For now, assume each prediction is from a unique predictor
        predictorCount = event_.totalPredictions;

        return (
            event_.totalPredictions,
            activeCount,
            finalizedCount,
            averagePredictionAge,
            predictorCount
        );
    }

    /// @notice Get user's prediction history across all events
    /// @param _user The user address
    function getUserPredictionHistory(address _user) external view returns (
        uint256 totalPredictions,
        uint256 activePredictions,
        uint256 finalizedPredictions,
        uint256[] memory participatedEventIds
    ) {
        uint256 eventCount = predictionEvents.length;
        uint256[] memory tempEventIds = new uint256[](eventCount);
        uint256 participatedCount = 0;
        uint256 activeCount = 0;
        uint256 finalizedCount = 0;

        for (uint256 i = 0; i < eventCount; i++) {
            if (userPredictions[i][_user].exists) {
                tempEventIds[participatedCount] = i;
                participatedCount++;

                PredictionEvent storage event_ = predictionEvents[i];
                if (event_.isFinalized) {
                    finalizedCount++;
                } else if (event_.isActive) {
                    activeCount++;
                }
            }
        }

        // Create properly sized array
        uint256[] memory finalEventIds = new uint256[](participatedCount);
        for (uint256 i = 0; i < participatedCount; i++) {
            finalEventIds[i] = tempEventIds[i];
        }

        return (
            participatedCount,
            activeCount,
            finalizedCount,
            finalEventIds
        );
    }

    /// @notice Get global statistics across all events
    function getGlobalStatistics() external view returns (
        uint256 totalEvents,
        uint256 activeEvents,
        uint256 finalizedEvents,
        uint256 totalPredictions,
        uint256 totalCryptoBalls,
        uint256 totalCollections
    ) {
        uint256 events = predictionEvents.length;
        uint256 active = 0;
        uint256 finalized = 0;
        uint256 predictions = 0;
        uint256 balls = cryptoBalls.length;
        uint256 collections = ballCollections.length;

        for (uint256 i = 0; i < events; i++) {
            PredictionEvent storage event_ = predictionEvents[i];
            predictions += event_.totalPredictions;

            if (event_.isFinalized) {
                finalized++;
            } else if (event_.isActive) {
                active++;
            }
        }

        return (
            events,
            active,
            finalized,
            predictions,
            balls,
            collections
        );
    }

    /// @notice Get user's encrypted prediction (user can decrypt their own)
    function getUserEncryptedPrediction(
        uint256 _eventId,
        address _user
    ) external view eventExists(_eventId) returns (euint32) {
        require(userPredictions[_eventId][_user].exists, "User has not predicted");
        return userPredictions[_eventId][_user].encryptedPrice;
    }

    /// @notice Generate a CryptoBall based on prediction performance
    /// @param _eventId The prediction event ID
    function generateCryptoBall(uint256 _eventId) external eventExists(_eventId) {
        // Verify user has submitted a prediction for this event
        require(userPredictions[_eventId][msg.sender].exists, "User must have submitted prediction");

        PredictionEvent storage event_ = predictionEvents[_eventId];
        require(event_.isFinalized, "Event must be finalized to generate ball");

        BallType ballType;
        uint256 powerLevel;

        // Simple ball generation logic based on event data
        if (event_.totalPredictions > 10) {
            ballType = BallType.CRYSTAL;
            powerLevel = 100;
        } else if (event_.totalPredictions > 5) {
            ballType = BallType.PREDICTION;
            powerLevel = 50;
        } else {
            ballType = BallType.VAULT;
            powerLevel = 25;
        }

        uint256 ballId = cryptoBalls.length;
        CryptoBall memory newBall = CryptoBall({
            ballType: ballType,
            generationTime: block.timestamp,
            powerLevel: powerLevel,
            owner: msg.sender,
            isActive: true
        });

        cryptoBalls.push(newBall);
        userBalls[msg.sender].push(ballId);

        emit CryptoBallGenerated(ballId, ballType, msg.sender);
    }

    /// @notice Get user's CryptoBall count
    function getUserBallCount(address _user) external view returns (uint256) {
        return userBalls[_user].length;
    }

    /// @notice Get CryptoBall details
    function getCryptoBall(uint256 _ballId) external view returns (
        BallType ballType,
        uint256 generationTime,
        uint256 powerLevel,
        address owner,
        bool isActive
    ) {
        CryptoBall storage ball = cryptoBalls[_ballId];
        return (ball.ballType, ball.generationTime, ball.powerLevel, ball.owner, ball.isActive);
    }

    /// @notice Store an encrypted value in the vault
    /// @param _encryptedValue The encrypted value to store
    /// @param inputProof The proof for the encrypted input
    function storeEncryptedValue(
        externalEuint32 _encryptedValue,
        bytes calldata inputProof
    ) external {
        // Initialize FHE context properly
        require(FHE.isInitialized(), "FHE not initialized");

        // Verify the input proof before conversion
        require(FHE.verifyProof(inputProof), "Invalid input proof");

        // Check input bounds
        require(_encryptedValue != externalEuint32.wrap(0), "Value cannot be zero");

        // Initialize encryption parameters
        FHE.initEncryption();

        // Set up encryption context
        FHE.setEncryptionContext(msg.sender);

        // Convert external encrypted input to internal euint32
        euint32 encryptedValue = FHE.fromExternal(_encryptedValue, inputProof);

        uint256 storageId = encryptedStorages.length;

        EncryptedStorage memory newStorage = EncryptedStorage({
            storedValue: encryptedValue,
            owner: msg.sender,
            timestamp: block.timestamp,
            isEncrypted: true
        });

        encryptedStorages.push(newStorage);
        userEncryptedStorages[msg.sender].push(storageId);

        // Grant decryption permissions
        FHE.allowThis(encryptedValue);
        FHE.allow(encryptedValue, msg.sender);

        // Set up decryption context
        FHE.setDecryptionContext(msg.sender, encryptedValue);

        emit ValueStored(storageId, msg.sender);
    }

    /// @notice Retrieve and decrypt a stored value
    /// @param _storageId The storage ID to retrieve
    function retrieveEncryptedValue(uint256 _storageId) external {
        require(_storageId < encryptedStorages.length, "Storage does not exist");

        EncryptedStorage storage storage_ = encryptedStorages[_storageId];
        require(storage_.owner == msg.sender, "Not the owner");
        require(storage_.isEncrypted, "Value not encrypted");
        require(storage_.timestamp > 0, "Invalid storage timestamp");

        // Verify FHE context is ready for decryption
        require(FHE.isInitialized(), "FHE context not initialized");

        // Ensure the stored value is still accessible
        require(!FHE.isNullified(storage_.storedValue), "Value has been nullified");

        // Prepare ciphertext for decryption
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(storage_.storedValue);

        // Request decryption with enhanced error handling
        uint256 requestId = FHE.requestDecryption(cts, this.valueDecryptionCallback.selector);

        // Store request mapping with validation
        require(_requestToEvent[requestId] == 0, "Request ID collision detected");
        _requestToEvent[requestId] = _storageId;
    }

    /// @notice Callback for value decryption
    function valueDecryptionCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes[] memory /*signatures*/
    ) public returns (bool) {
        uint256 storageId = _requestToEvent[requestId];
        EncryptedStorage storage storage_ = encryptedStorages[storageId];

        require(cleartexts.length >= 4, "Invalid cleartexts length");
        uint32 decryptedValue;
        assembly {
            decryptedValue := shr(224, mload(add(cleartexts, 32)))
        }

        emit ValueRetrieved(storageId, storage_.owner, decryptedValue);
        return true;
    }

    /// @notice Get encrypted storage count for user
    function getUserStorageCount(address _user) external view returns (uint256) {
        return userEncryptedStorages[_user].length;
    }

    /// @notice Create a new CryptoBall collection
    /// @param _name The name of the collection
    /// @param _isPublic Whether the collection is publicly visible
    function createBallCollection(string memory _name, bool _isPublic) external returns (uint256) {
        require(bytes(_name).length > 0, "Collection name cannot be empty");
        require(bytes(_name).length <= 50, "Collection name too long");

        uint256 collectionId = ballCollections.length;

        BallCollection memory newCollection = BallCollection({
            name: _name,
            owner: msg.sender,
            ballIds: new uint256[](0),
            createdAt: block.timestamp,
            isPublic: _isPublic
        });

        ballCollections.push(newCollection);
        userCollections[msg.sender].push(collectionId);

        emit CollectionCreated(collectionId, msg.sender, _name);
        return collectionId;
    }

    /// @notice Add a ball to a collection
    /// @param _collectionId The collection ID
    /// @param _ballId The ball ID to add
    function addBallToCollection(uint256 _collectionId, uint256 _ballId) external {
        require(_collectionId < ballCollections.length, "Collection does not exist");
        require(_ballId < cryptoBalls.length, "Ball does not exist");

        BallCollection storage collection = ballCollections[_collectionId];
        CryptoBall storage ball = cryptoBalls[_ballId];

        require(collection.owner == msg.sender, "Not collection owner");
        require(ball.owner == msg.sender, "Not ball owner");
        require(ball.isActive, "Ball is not active");

        // Check if ball is already in collection
        for (uint256 i = 0; i < collection.ballIds.length; i++) {
            require(collection.ballIds[i] != _ballId, "Ball already in collection");
        }

        collection.ballIds.push(_ballId);
        emit BallAddedToCollection(_collectionId, _ballId, msg.sender);
    }

    /// @notice Remove a ball from a collection
    /// @param _collectionId The collection ID
    /// @param _ballId The ball ID to remove
    function removeBallFromCollection(uint256 _collectionId, uint256 _ballId) external {
        require(_collectionId < ballCollections.length, "Collection does not exist");

        BallCollection storage collection = ballCollections[_collectionId];
        require(collection.owner == msg.sender, "Not collection owner");

        // Find and remove the ball
        for (uint256 i = 0; i < collection.ballIds.length; i++) {
            if (collection.ballIds[i] == _ballId) {
                collection.ballIds[i] = collection.ballIds[collection.ballIds.length - 1];
                collection.ballIds.pop();
                emit BallRemovedFromCollection(_collectionId, _ballId, msg.sender);
                return;
            }
        }

        revert("Ball not found in collection");
    }

    /// @notice Get collection details
    /// @param _collectionId The collection ID
    function getBallCollection(uint256 _collectionId) external view returns (
        string memory name,
        address owner,
        uint256[] memory ballIds,
        uint256 createdAt,
        bool isPublic
    ) {
        require(_collectionId < ballCollections.length, "Collection does not exist");

        BallCollection storage collection = ballCollections[_collectionId];

        // Only owner or public collections can be viewed
        require(collection.owner == msg.sender || collection.isPublic, "Collection not accessible");

        return (
            collection.name,
            collection.owner,
            collection.ballIds,
            collection.createdAt,
            collection.isPublic
        );
    }

    /// @notice Get user's collection count
    function getUserCollectionCount(address _user) external view returns (uint256) {
        return userCollections[_user].length;
    }

    /// @notice Authorize or revoke price feeder permissions
    /// @param _feeder The address to authorize/revoke
    /// @param _authorized Whether to authorize or revoke
    function setPriceFeederAuthorization(address _feeder, bool _authorized) external {
        require(msg.sender == priceFeedAdmin, "Only price feed admin can authorize feeders");
        authorizedPriceFeeders[_feeder] = _authorized;
        emit PriceFeedAuthorized(_feeder, _authorized);
    }

    /// @notice Update price for a token type (authorized feeders only)
    /// @param _tokenType The token type (BTC or ETH)
    /// @param _price The current price in USD * 100 (e.g., 50000 = $50,000)
    function updatePrice(TokenType _tokenType, uint256 _price) external {
        require(authorizedPriceFeeders[msg.sender], "Not authorized to update prices");
        require(_price > 0, "Price must be greater than 0");
        require(_price < 100000000, "Price seems unreasonably high"); // Max $1M

        PriceData memory newPriceData = PriceData({
            price: _price,
            timestamp: block.timestamp,
            updater: msg.sender,
            isValid: true
        });

        latestPrices[_tokenType] = newPriceData;
        priceHistory[_tokenType].push(newPriceData);

        // Keep only last 100 price updates for gas efficiency
        if (priceHistory[_tokenType].length > 100) {
            // Remove oldest prices (keep most recent 100)
            for (uint256 i = 0; i < priceHistory[_tokenType].length - 100; i++) {
                delete priceHistory[_tokenType][i];
            }
            // This is simplified - in production you'd want a more efficient circular buffer
        }

        emit PriceUpdated(_tokenType, _price, block.timestamp, msg.sender);
    }

    /// @notice Get current price for a token type
    /// @param _tokenType The token type
    function getCurrentPrice(TokenType _tokenType) external view returns (
        uint256 price,
        uint256 timestamp,
        address updater,
        bool isValid
    ) {
        PriceData memory priceData = latestPrices[_tokenType];
        return (
            priceData.price,
            priceData.timestamp,
            priceData.updater,
            priceData.isValid
        );
    }

    /// @notice Get price history for a token type
    /// @param _tokenType The token type
    /// @param _limit Maximum number of historical prices to return
    function getPriceHistory(TokenType _tokenType, uint256 _limit) external view returns (
        uint256[] memory prices,
        uint256[] memory timestamps,
        address[] memory updaters
    ) {
        PriceData[] memory history = priceHistory[_tokenType];
        uint256 historyLength = history.length;
        uint256 returnCount = _limit > historyLength ? historyLength : _limit;

        uint256[] memory returnPrices = new uint256[](returnCount);
        uint256[] memory returnTimestamps = new uint256[](returnCount);
        address[] memory returnUpdaters = new address[](returnCount);

        // Return most recent prices first
        for (uint256 i = 0; i < returnCount; i++) {
            uint256 historyIndex = historyLength - 1 - i;
            PriceData memory priceData = history[historyIndex];
            returnPrices[i] = priceData.price;
            returnTimestamps[i] = priceData.timestamp;
            returnUpdaters[i] = priceData.updater;
        }

        return (returnPrices, returnTimestamps, returnUpdaters);
    }

    /// @notice Get price statistics for a token type
    /// @param _tokenType The token type
    function getPriceStatistics(TokenType _tokenType) external view returns (
        uint256 currentPrice,
        uint256 averagePrice,
        uint256 highestPrice,
        uint256 lowestPrice,
        uint256 priceChange24h,
        uint256 volatility
    ) {
        PriceData[] memory history = priceHistory[_tokenType];
        uint256 historyLength = history.length;

        if (historyLength == 0) {
            return (0, 0, 0, 0, 0, 0);
        }

        uint256 current = latestPrices[_tokenType].price;
        uint256 total = 0;
        uint256 highest = 0;
        uint256 lowest = type(uint256).max;
        uint256 price24hAgo = 0;

        // Calculate statistics from available history
        for (uint256 i = 0; i < historyLength; i++) {
            uint256 price = history[i].price;
            total += price;

            if (price > highest) highest = price;
            if (price < lowest) lowest = price;

            // Find price from ~24 hours ago (assuming updates every few hours)
            if (i >= 8 && price24hAgo == 0) { // Rough approximation
                price24hAgo = price;
            }
        }

        uint256 average = total / historyLength;
        uint256 change24h = price24hAgo > 0 ? current > price24hAgo ?
            current - price24hAgo : price24hAgo - current : 0;

        // Simplified volatility calculation (standard deviation)
        uint256 variance = 0;
        for (uint256 i = 0; i < historyLength; i++) {
            uint256 diff = history[i].price > average ?
                history[i].price - average : average - history[i].price;
            variance += diff * diff;
        }
        uint256 volatilityValue = historyLength > 1 ? sqrt(variance / (historyLength - 1)) : 0;

        return (
            current,
            average,
            highest,
            lowest,
            change24h,
            volatilityValue
        );
    }

    /// @notice Simple square root function for volatility calculation
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    /// @notice Set user preferences
    /// @param _emailNotifications Enable email notifications
    /// @param _priceAlerts Enable price alerts
    /// @param _minAlertThreshold Minimum price change threshold (basis points)
    /// @param _preferredToken Preferred token type
    /// @param _autoGenerateBalls Auto-generate balls after predictions
    /// @param _publicProfile Make profile public
    /// @param _displayName Display name (max 32 characters)
    /// @param _theme UI theme preference
    function setUserPreferences(
        bool _emailNotifications,
        bool _priceAlerts,
        uint256 _minAlertThreshold,
        TokenType _preferredToken,
        bool _autoGenerateBalls,
        bool _publicProfile,
        string memory _displayName,
        uint256 _theme
    ) external {
        require(_minAlertThreshold <= 10000, "Threshold cannot exceed 100%");
        require(_theme <= 2, "Invalid theme");
        require(bytes(_displayName).length <= 32, "Display name too long");

        userPreferences[msg.sender] = UserPreferences({
            emailNotifications: _emailNotifications,
            priceAlerts: _priceAlerts,
            minAlertThreshold: _minAlertThreshold,
            preferredToken: _preferredToken,
            autoGenerateBalls: _autoGenerateBalls,
            publicProfile: _publicProfile,
            displayName: _displayName,
            theme: _theme
        });

        hasSetPreferences[msg.sender] = true;
        emit UserPreferencesUpdated(msg.sender);
    }

    /// @notice Get user preferences
    function getUserPreferences(address _user) external view returns (
        bool emailNotifications,
        bool priceAlerts,
        uint256 minAlertThreshold,
        TokenType preferredToken,
        bool autoGenerateBalls,
        bool publicProfile,
        string memory displayName,
        uint256 theme
    ) {
        // Only user themselves or if profile is public
        require(_user == msg.sender || userPreferences[_user].publicProfile, "Profile not public");

        UserPreferences memory prefs = userPreferences[_user];
        return (
            prefs.emailNotifications,
            prefs.priceAlerts,
            prefs.minAlertThreshold,
            prefs.preferredToken,
            prefs.autoGenerateBalls,
            prefs.publicProfile,
            prefs.displayName,
            prefs.theme
        );
    }

    /// @notice Check if price alert should be triggered for user
    /// @param _user The user to check
    /// @param _tokenType The token type
    /// @param _currentPrice The current price
    /// @param _previousPrice The previous price
    function shouldTriggerPriceAlert(
        address _user,
        TokenType _tokenType,
        uint256 _currentPrice,
        uint256 _previousPrice
    ) external view returns (bool) {
        if (!hasSetPreferences[_user] || !userPreferences[_user].priceAlerts) {
            return false;
        }

        // Only trigger for preferred token
        if (userPreferences[_user].preferredToken != _tokenType) {
            return false;
        }

        // Calculate price change in basis points
        uint256 change;
        if (_currentPrice > _previousPrice) {
            change = ((_currentPrice - _previousPrice) * 10000) / _previousPrice;
        } else {
            change = ((_previousPrice - _currentPrice) * 10000) / _previousPrice;
        }

        return change >= userPreferences[_user].minAlertThreshold;
    }

    /// @notice Trigger price alert for user (can be called by authorized price feeders)
    /// @param _user The user to alert
    /// @param _tokenType The token type
    /// @param _price The current price
    /// @param _change The price change amount
    function triggerPriceAlert(
        address _user,
        TokenType _tokenType,
        uint256 _price,
        uint256 _change
    ) external {
        require(authorizedPriceFeeders[msg.sender], "Not authorized to trigger alerts");
        require(hasSetPreferences[_user], "User has no preferences set");
        require(userPreferences[_user].priceAlerts, "User has alerts disabled");

        emit PriceAlertTriggered(_user, _tokenType, _price, _change);
    }

    /// @notice Get user's public profile information
    function getUserPublicProfile(address _user) external view returns (
        string memory displayName,
        bool hasPublicProfile,
        uint256 totalPredictions,
        uint256 totalBalls,
        uint256 totalCollections
    ) {
        UserPreferences memory prefs = userPreferences[_user];

        if (!prefs.publicProfile) {
            return ("", false, 0, 0, 0);
        }

        (uint256 predictions,,) = getUserPredictionHistory(_user);

        return (
            prefs.displayName,
            true,
            predictions,
            userBalls[_user].length,
            userCollections[_user].length
        );
    }

    /// @notice Reset user preferences to defaults
    function resetUserPreferences() external {
        delete userPreferences[msg.sender];
        hasSetPreferences[msg.sender] = false;
        emit UserPreferencesUpdated(msg.sender);
    }

    /// @notice Get filtered and sorted events
    /// @param _statusFilter 0: all, 1: active, 2: ended, 3: finalized
    /// @param _tokenFilter 0: all, 1: BTC, 2: ETH
    /// @param _sortBy 0: creation time, 1: end time, 2: total predictions, 3: target date
    /// @param _sortOrder 0: ascending, 1: descending
    /// @param _limit Maximum events to return
    /// @param _offset Starting offset for pagination
    function getFilteredEvents(
        uint256 _statusFilter,
        uint256 _tokenFilter,
        uint256 _sortBy,
        uint256 _sortOrder,
        uint256 _limit,
        uint256 _offset
    ) external view returns (
        uint256[] memory eventIds,
        string[] memory titles,
        TokenType[] memory tokenTypes,
        uint256[] memory endTimes,
        bool[] memory isActive,
        bool[] memory isFinalized,
        uint256[] memory totalPredictions
    ) {
        uint256 totalEvents = predictionEvents.length;
        uint256[] memory tempEventIds = new uint256[](totalEvents);
        uint256 filteredCount = 0;

        // First pass: filter events
        for (uint256 i = 0; i < totalEvents; i++) {
            PredictionEvent storage event_ = predictionEvents[i];
            bool matchesFilter = true;

            // Status filter
            if (_statusFilter == 1 && !event_.isActive) matchesFilter = false;
            if (_statusFilter == 2 && (event_.isActive || !event_.isFinalized)) matchesFilter = false;
            if (_statusFilter == 3 && !event_.isFinalized) matchesFilter = false;

            // Token filter
            if (_tokenFilter == 1 && event_.tokenType != TokenType.BTC) matchesFilter = false;
            if (_tokenFilter == 2 && event_.tokenType != TokenType.ETH) matchesFilter = false;

            if (matchesFilter) {
                tempEventIds[filteredCount] = i;
                filteredCount++;
            }
        }

        // Sort filtered events
        for (uint256 i = 0; i < filteredCount - 1; i++) {
            for (uint256 j = 0; j < filteredCount - i - 1; j++) {
                bool shouldSwap = false;
                uint256 leftId = tempEventIds[j];
                uint256 rightId = tempEventIds[j + 1];
                PredictionEvent storage leftEvent = predictionEvents[leftId];
                PredictionEvent storage rightEvent = predictionEvents[rightId];

                if (_sortBy == 0) { // creation time (using array index as proxy)
                    shouldSwap = _sortOrder == 0 ? leftId > rightId : leftId < rightId;
                } else if (_sortBy == 1) { // end time
                    shouldSwap = _sortOrder == 0 ? leftEvent.endTime > rightEvent.endTime : leftEvent.endTime < rightEvent.endTime;
                } else if (_sortBy == 2) { // total predictions
                    shouldSwap = _sortOrder == 0 ? leftEvent.totalPredictions > rightEvent.totalPredictions : leftEvent.totalPredictions < rightEvent.totalPredictions;
                } else if (_sortBy == 3) { // target date
                    shouldSwap = _sortOrder == 0 ? leftEvent.targetDate > rightEvent.targetDate : leftEvent.targetDate < rightEvent.targetDate;
                }

                if (shouldSwap) {
                    uint256 temp = tempEventIds[j];
                    tempEventIds[j] = tempEventIds[j + 1];
                    tempEventIds[j + 1] = temp;
                }
            }
        }

        // Pagination
        uint256 startIndex = _offset;
        uint256 endIndex = startIndex + _limit;
        if (endIndex > filteredCount) endIndex = filteredCount;
        if (startIndex >= filteredCount) {
            // Return empty arrays
            return (new uint256[](0), new string[](0), new TokenType[](0), new uint256[](0), new bool[](0), new bool[](0), new uint256[](0));
        }

        uint256 resultCount = endIndex - startIndex;
        uint256[] memory resultEventIds = new uint256[](resultCount);
        string[] memory resultTitles = new string[](resultCount);
        TokenType[] memory resultTokenTypes = new TokenType[](resultCount);
        uint256[] memory resultEndTimes = new uint256[](resultCount);
        bool[] memory resultIsActive = new bool[](resultCount);
        bool[] memory resultIsFinalized = new bool[](resultCount);
        uint256[] memory resultTotalPredictions = new uint256[](resultCount);

        for (uint256 i = 0; i < resultCount; i++) {
            uint256 eventId = tempEventIds[startIndex + i];
            PredictionEvent storage event_ = predictionEvents[eventId];

            resultEventIds[i] = eventId;
            resultTitles[i] = event_.title;
            resultTokenTypes[i] = event_.tokenType;
            resultEndTimes[i] = event_.endTime;
            resultIsActive[i] = event_.isActive;
            resultIsFinalized[i] = event_.isFinalized;
            resultTotalPredictions[i] = event_.totalPredictions;
        }

        return (
            resultEventIds,
            resultTitles,
            resultTokenTypes,
            resultEndTimes,
            resultIsActive,
            resultIsFinalized,
            resultTotalPredictions
        );
    }

    /// @notice Get filtered CryptoBalls for user
    /// @param _user The user address
    /// @param _ballTypeFilter 0: all, 1: Crystal, 2: Prediction, 3: Vault
    /// @param _activeFilter 0: all, 1: active only, 2: inactive only
    /// @param _sortBy 0: generation time, 1: power level, 2: ball type
    /// @param _sortOrder 0: ascending, 1: descending
    function getFilteredUserBalls(
        address _user,
        uint256 _ballTypeFilter,
        uint256 _activeFilter,
        uint256 _sortBy,
        uint256 _sortOrder
    ) external view returns (
        uint256[] memory ballIds,
        BallType[] memory ballTypes,
        uint256[] memory powerLevels,
        bool[] memory isActive
    ) {
        uint256[] memory userBallIds = userBalls[_user];
        uint256 totalBalls = userBallIds.length;

        // Count matching balls
        uint256 matchCount = 0;
        for (uint256 i = 0; i < totalBalls; i++) {
            uint256 ballId = userBallIds[i];
            (BallType ballType, , uint256 powerLevel, , bool active) = getCryptoBall(ballId);

            bool matchesType = _ballTypeFilter == 0 ||
                (_ballTypeFilter == 1 && ballType == BallType.CRYSTAL) ||
                (_ballTypeFilter == 2 && ballType == BallType.PREDICTION) ||
                (_ballTypeFilter == 3 && ballType == BallType.VAULT);

            bool matchesActive = _activeFilter == 0 ||
                (_activeFilter == 1 && active) ||
                (_activeFilter == 2 && !active);

            if (matchesType && matchesActive) {
                matchCount++;
            }
        }

        // Create result arrays
        uint256[] memory resultBallIds = new uint256[](matchCount);
        BallType[] memory resultBallTypes = new BallType[](matchCount);
        uint256[] memory resultPowerLevels = new uint256[](matchCount);
        bool[] memory resultIsActive = new bool[](matchCount);

        uint256 resultIndex = 0;
        for (uint256 i = 0; i < totalBalls; i++) {
            uint256 ballId = userBallIds[i];
            (BallType ballType, , uint256 powerLevel, , bool active) = getCryptoBall(ballId);

            bool matchesType = _ballTypeFilter == 0 ||
                (_ballTypeFilter == 1 && ballType == BallType.CRYSTAL) ||
                (_ballTypeFilter == 2 && ballType == BallType.PREDICTION) ||
                (_ballTypeFilter == 3 && ballType == BallType.VAULT);

            bool matchesActive = _activeFilter == 0 ||
                (_activeFilter == 1 && active) ||
                (_activeFilter == 2 && !active);

            if (matchesType && matchesActive) {
                resultBallIds[resultIndex] = ballId;
                resultBallTypes[resultIndex] = ballType;
                resultPowerLevels[resultIndex] = powerLevel;
                resultIsActive[resultIndex] = active;
                resultIndex++;
            }
        }

        // Simple bubble sort (small arrays expected)
        for (uint256 i = 0; i < matchCount - 1; i++) {
            for (uint256 j = 0; j < matchCount - i - 1; j++) {
                bool shouldSwap = false;

                if (_sortBy == 0) { // generation time (using ball ID as proxy)
                    shouldSwap = _sortOrder == 0 ? resultBallIds[j] > resultBallIds[j + 1] : resultBallIds[j] < resultBallIds[j + 1];
                } else if (_sortBy == 1) { // power level
                    shouldSwap = _sortOrder == 0 ? resultPowerLevels[j] > resultPowerLevels[j + 1] : resultPowerLevels[j] < resultPowerLevels[j + 1];
                } else if (_sortBy == 2) { // ball type
                    shouldSwap = _sortOrder == 0 ? uint256(resultBallTypes[j]) > uint256(resultBallTypes[j + 1]) : uint256(resultBallTypes[j]) < uint256(resultBallTypes[j + 1]);
                }

                if (shouldSwap) {
                    // Swap all arrays
                    uint256 tempUint = resultBallIds[j];
                    resultBallIds[j] = resultBallIds[j + 1];
                    resultBallIds[j + 1] = tempUint;

                    BallType tempType = resultBallTypes[j];
                    resultBallTypes[j] = resultBallTypes[j + 1];
                    resultBallTypes[j + 1] = tempType;

                    tempUint = resultPowerLevels[j];
                    resultPowerLevels[j] = resultPowerLevels[j + 1];
                    resultPowerLevels[j + 1] = tempUint;

                    bool tempBool = resultIsActive[j];
                    resultIsActive[j] = resultIsActive[j + 1];
                    resultIsActive[j + 1] = tempBool;
                }
            }
        }

        return (resultBallIds, resultBallTypes, resultPowerLevels, resultIsActive);
    }

    /// @notice Transfer a CryptoBall to another address
    /// @param _ballId The ball ID to transfer
    /// @param _to The recipient address
    function transferCryptoBall(uint256 _ballId, address _to) external {
        require(_to != address(0), "Cannot transfer to zero address");
        require(_ballId < cryptoBalls.length, "Ball does not exist");

        CryptoBall storage ball = cryptoBalls[_ballId];

        // Verify ownership before transfer
        require(ball.owner == msg.sender, "Not the owner");

        require(ball.isActive, "Ball is not active");

        // Update ownership
        address previousOwner = ball.owner;
        ball.owner = _to;

        // Update user ball mappings
        // Remove from previous owner
        uint256[] storage previousOwnerBalls = userBalls[previousOwner];
        for (uint256 i = 0; i < previousOwnerBalls.length; i++) {
            if (previousOwnerBalls[i] == _ballId) {
                previousOwnerBalls[i] = previousOwnerBalls[previousOwnerBalls.length - 1];
                previousOwnerBalls.pop();
                break;
            }
        }

        // Add to new owner
        userBalls[_to].push(_ballId);

        // BUG: Event not properly indexed - missing indexed keyword for ballId
        emit BallTransferred(previousOwner, _ballId, _to);
    }

    /// @notice Transfer encrypted storage to another address
    /// @param _storageId The storage ID to transfer
    /// @param _to The recipient address
    function transferEncryptedStorage(uint256 _storageId, address _to) external {
        require(_to != address(0), "Cannot transfer to zero address");
        require(_storageId < encryptedStorages.length, "Storage does not exist");

        EncryptedStorage storage storage_ = encryptedStorages[_storageId];
        require(storage_.owner == msg.sender, "Not the owner");

        address previousOwner = storage_.owner;
        storage_.owner = _to;

        // Update user storage mappings
        uint256[] storage previousOwnerStorages = userEncryptedStorages[previousOwner];
        for (uint256 i = 0; i < previousOwnerStorages.length; i++) {
            if (previousOwnerStorages[i] == _storageId) {
                previousOwnerStorages[i] = previousOwnerStorages[previousOwnerStorages.length - 1];
                previousOwnerStorages.pop();
                break;
            }
        }

        userEncryptedStorages[_to].push(_storageId);

        emit StorageTransferred(_storageId, previousOwner, _to);
    }
}

