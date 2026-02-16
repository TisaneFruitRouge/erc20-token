// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IERC20 {
    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address to, uint256 value) external returns (bool);

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    function approve(address spender, uint256 value) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

contract Token is IERC20 {
    string public name;
    string public symbol;
    //uint8 public decimals = 18;

    uint public supply = 1e9 * 10 ** 18;

    mapping(address => uint) public balances;
    mapping(address => mapping(address => uint)) public allowances;

    mapping(bytes32 => mapping(address => bool)) public roles;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
        //decimals = _decimals;

        roles[OWNER_ROLE][msg.sender] = true;
        roles[BURNER_ROLE][msg.sender] = true;
        roles[MINTER_ROLE][msg.sender] = true;

        balances[msg.sender] = supply;
        emit Transfer(address(0), msg.sender, supply);
    }

    modifier onlyRole(bytes32 role) {
        require(
            roles[role][msg.sender],
            "You don't have permission to perform this action"
        );
        _;
    }

    function decimals() public pure returns (uint8) {
        return 18;
    }

    function mint(address _to, uint _amount) public onlyRole(MINTER_ROLE) {
        require(_to != address(0), "Transfer address is not valid");
        supply += _amount;
        balances[_to] += _amount;

        emit Transfer(address(0), _to, _amount);
    }

    function burn(address _from, uint _amount) public onlyRole(BURNER_ROLE) {
        require(_from != address(0), "Transfer address is not valid");
        require(balances[_from] >= _amount, "Not enough coins to burn");

        balances[_from] -= _amount;
        supply -= _amount;

        emit Transfer(_from, address(0), _amount);
    }

    function grantRole(address _to, bytes32 _role) public onlyRole(OWNER_ROLE) {
        roles[_role][_to] = true;

        emit RoleChanged(_to, _role, false);
    }

    function revokeRole(
        address _to,
        bytes32 _role
    ) public onlyRole(OWNER_ROLE) {
        require(
            _to != msg.sender || _role != OWNER_ROLE,
            "Cannot revoke own owner role"
        );
        roles[_role][_to] = false;

        emit RoleChanged(_to, _role, true);
    }

    function totalSupply() public view returns (uint256) {
        return supply;
    }

    function balanceOf(address _owner) public view returns (uint256) {
        return balances[_owner];
    }

    function transfer(
        address _to,
        uint256 _value
    ) public returns (bool success) {
        address _sender = msg.sender;
        uint _senderBalance = balances[_sender];

        require(_to != address(0), "Transfer address is not valid");
        require(_senderBalance >= _value, "Insufficient funds");

        balances[_sender] -= _value;
        balances[_to] += _value;

        emit Transfer(_sender, _to, _value);
        return true;
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) public returns (bool success) {
        address _spender = msg.sender;
        uint _allowance = allowances[_from][_spender];

        require(_to != address(0), "Transfer address is not valid");
        require(balances[_from] >= _value, "Insufficient funds");
        require(_allowance >= _value, "Allowance is too small");

        balances[_from] -= _value;
        balances[_to] += _value;
        allowances[_from][_spender] -= _value;

        emit Transfer(_from, _to, _value);

        return true;
    }

    function approve(address _spender, uint256 _value) public returns (bool) {
        require(_spender != address(0), "Spender address is not valid");

        address _owner = msg.sender;

        allowances[_owner][_spender] = _value;

        emit Approval(_owner, _spender, _value);
        return true;
    }

    function increaseAllowance(
        address _spender,
        uint256 _value
    ) public returns (bool) {
        require(_spender != address(0), "Spender address is not valid");

        address _owner = msg.sender;

        allowances[_owner][_spender] += _value;

        emit Approval(_owner, _spender, allowances[_owner][_spender]);

        return true;
    }

    function decreaseAllowance(
        address _spender,
        uint256 _value
    ) public returns (bool) {
        require(_spender != address(0), "Spender address is not valid");
        address _owner = msg.sender;
        require(
            allowances[_owner][_spender] >= _value,
            "Remaining allowance is too small"
        );

        allowances[_owner][_spender] -= _value;

        emit Approval(_owner, _spender, allowances[_owner][_spender]);

        return true;
    }

    function allowance(
        address _owner,
        address _spender
    ) public view returns (uint256) {
        return allowances[_owner][_spender];
    }

    event RoleChanged(
        address indexed _address,
        bytes32 indexed _role,
        bool indexed _revoked
    );
}
