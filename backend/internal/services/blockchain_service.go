package services

import (
	"context"
	"crypto/ecdsa"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"os"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/quychung/backend/internal/models"
)

// BlockchainService handles blockchain interactions
type BlockchainService struct {
	client         *ethclient.Client
	privateKey     *ecdsa.PrivateKey
	contractAddr   common.Address
	contractABI    abi.ABI
	chainID        *big.Int
}

// ContractDeployment represents the deployed contract info
type ContractDeployment struct {
	Address string          `json:"address"`
	ABI     json.RawMessage `json:"abi"`
}

// NewBlockchainService creates a new blockchain service
func NewBlockchainService() (*BlockchainService, error) {
	rpcURL := os.Getenv("BLOCKCHAIN_RPC")
	if rpcURL == "" {
		rpcURL = "http://localhost:8545"
	}

	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to blockchain: %w", err)
	}

	// Get chain ID
	chainID, err := client.ChainID(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to get chain ID: %w", err)
	}

	// Load private key
	privateKeyHex := os.Getenv("TREASURY_PRIVATE_KEY")
	if privateKeyHex == "" {
		return nil, fmt.Errorf("TREASURY_PRIVATE_KEY not set")
	}

	// Remove 0x prefix if present
	privateKeyHex = strings.TrimPrefix(privateKeyHex, "0x")

	privateKey, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		return nil, fmt.Errorf("failed to load private key: %w", err)
	}

	// Load contract ABI and address
	contractAddr, contractABI, err := loadContract()
	if err != nil {
		log.Printf("Warning: Contract not loaded: %v. Will attempt to deploy later.", err)
	}

	return &BlockchainService{
		client:       client,
		privateKey:   privateKey,
		contractAddr: contractAddr,
		contractABI:  contractABI,
		chainID:      chainID,
	}, nil
}

// loadContract loads the deployed contract information
func loadContract() (common.Address, abi.ABI, error) {
	// Check if file exists
	log.Println("DEBUG: Attempting to load contracts/TreasuryLogger.json")

	// List files in current directory
	if entries, err := os.ReadDir("."); err == nil {
		log.Println("DEBUG: Files in current directory:")
		for _, entry := range entries {
			log.Printf("  - %s (dir: %v)", entry.Name(), entry.IsDir())
		}
	}

	// Check contracts directory
	if entries, err := os.ReadDir("contracts"); err == nil {
		log.Println("DEBUG: Files in contracts/ directory:")
		for _, entry := range entries {
			info, _ := entry.Info()
			log.Printf("  - %s (size: %d bytes)", entry.Name(), info.Size())
		}
	} else {
		log.Printf("ERROR: Cannot read contracts/ directory: %v", err)
	}

	// Try to load from contracts/TreasuryLogger.json
	data, err := os.ReadFile("contracts/TreasuryLogger.json")
	if err != nil {
		return common.Address{}, abi.ABI{}, fmt.Errorf("failed to read contract file: %w", err)
	}

	log.Printf("DEBUG: Successfully read contract file, size: %d bytes", len(data))

	var deployment ContractDeployment
	if err := json.Unmarshal(data, &deployment); err != nil {
		return common.Address{}, abi.ABI{}, fmt.Errorf("failed to parse contract file: %w", err)
	}

	contractAddr := common.HexToAddress(deployment.Address)
	log.Printf("DEBUG: Contract address: %s", contractAddr.Hex())

	// Parse ABI
	contractABI, err := abi.JSON(strings.NewReader(string(deployment.ABI)))
	if err != nil {
		return common.Address{}, abi.ABI{}, fmt.Errorf("failed to parse contract ABI: %w", err)
	}

	log.Println("DEBUG: Contract ABI parsed successfully")
	return contractAddr, contractABI, nil
}

// LogTransaction logs a transaction on the blockchain (minimal version - only event)
func (s *BlockchainService) LogTransaction(
	ctx context.Context,
	treasuryAddr common.Address,
	transaction *models.Transaction,
) (string, string, error) {
	log.Printf("BLOCKCHAIN: ========== LogTransaction START (Minimal) ==========")
	log.Printf("BLOCKCHAIN: Transaction ID: %s", transaction.ID)
	log.Printf("BLOCKCHAIN: Treasury Address: %s", treasuryAddr.Hex())

	// Create detail hash from transaction data
	detailHash := s.createDetailHash(transaction)
	detailHashHex := "0x" + hex.EncodeToString(detailHash[:])
	log.Printf("BLOCKCHAIN: Detail hash: %s", detailHashHex)

	// Pack only 2 parameters: treasury address and detail hash
	log.Printf("BLOCKCHAIN: Packing minimal contract call...")
	data, err := s.contractABI.Pack(
		"logTransaction",
		treasuryAddr,
		detailHash,
	)
	if err != nil {
		log.Printf("BLOCKCHAIN ERROR: Failed to pack data: %v", err)
		return "", "", fmt.Errorf("failed to pack data: %w", err)
	}
	log.Printf("BLOCKCHAIN: Data packed (%d bytes)", len(data))

	// Get sender address
	publicKey := s.privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return "", "", fmt.Errorf("failed to cast public key")
	}
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)

	// Get nonce
	nonce, err := s.client.PendingNonceAt(ctx, fromAddress)
	if err != nil {
		log.Printf("BLOCKCHAIN ERROR: Failed to get nonce: %v", err)
		return "", "", fmt.Errorf("failed to get nonce: %w", err)
	}

	// Get gas price
	gasPrice, err := s.client.SuggestGasPrice(ctx)
	if err != nil {
		log.Printf("BLOCKCHAIN ERROR: Failed to get gas price: %v", err)
		return "", "", fmt.Errorf("failed to get gas price: %w", err)
	}

	// Minimal gas limit for event-only transaction
	gasLimit := uint64(50000)
	log.Printf("BLOCKCHAIN: Gas limit: %d (minimal)", gasLimit)

	// Create and sign transaction
	tx := types.NewTransaction(nonce, s.contractAddr, big.NewInt(0), gasLimit, gasPrice, data)
	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(s.chainID), s.privateKey)
	if err != nil {
		return "", "", fmt.Errorf("failed to sign: %w", err)
	}

	// Send transaction
	err = s.client.SendTransaction(ctx, signedTx)
	if err != nil {
		log.Printf("BLOCKCHAIN ERROR: Send failed: %v", err)
		return "", "", fmt.Errorf("failed to send: %w", err)
	}

	txHash := signedTx.Hash().Hex()
	log.Printf("BLOCKCHAIN: ========== SUCCESS ==========")
	log.Printf("BLOCKCHAIN: TX Hash: %s", txHash)
	log.Printf("BLOCKCHAIN: Detail Hash: %s", detailHashHex)

	return txHash, detailHashHex, nil
}

// createDetailHash creates a hash of transaction details
func (s *BlockchainService) createDetailHash(transaction *models.Transaction) [32]byte {
	data := fmt.Sprintf(
		"%s|%s|%.8f|%s|%s",
		transaction.ID.String(),
		transaction.Type,
		transaction.AmountToken,
		transaction.Note,
		transaction.CreatedAt.String(),
	)

	hash := crypto.Keccak256Hash([]byte(data))
	var result [32]byte
	copy(result[:], hash[:])
	return result
}

// GetTransactionReceipt gets the receipt of a transaction
func (s *BlockchainService) GetTransactionReceipt(ctx context.Context, txHash string) (*types.Receipt, error) {
	hash := common.HexToHash(txHash)
	receipt, err := s.client.TransactionReceipt(ctx, hash)
	if err != nil {
		return nil, fmt.Errorf("failed to get transaction receipt: %w", err)
	}
	return receipt, nil
}

// GenerateTreasuryAddress generates a new address for a treasury
func (s *BlockchainService) GenerateTreasuryAddress() (string, error) {
	// Generate a new private key
	privateKey, err := crypto.GenerateKey()
	if err != nil {
		return "", fmt.Errorf("failed to generate key: %w", err)
	}

	// Get public key and address
	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return "", fmt.Errorf("failed to cast public key to ECDSA")
	}

	address := crypto.PubkeyToAddress(*publicKeyECDSA)
	return address.Hex(), nil
}

// Close closes the blockchain client connection
func (s *BlockchainService) Close() {
	s.client.Close()
}
